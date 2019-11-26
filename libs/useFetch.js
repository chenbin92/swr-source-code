import { useState, useEffect, useContext, useCallback, useRef } from 'react'
import deepEqual from 'fast-deep-equal'
import throttle from 'lodash/throttle'
import useFetchConfigContext from './useFetch-config-context'
import defaultConfig, {
  CONCURRENT_PROMISES,
  FOCUS_REVALIDATORS,
  CACHE_REVALIDATORS,
  cacheGet,
  cacheSet
} from './config'
import { unstable_batchedUpdates } from './reactBatchedUpdates'
import hash from '../utils/hash'

const getErrorKey = key => (key ? `err@${key}` : '')
const getKeyArgs = _key => {
  let key
  let args = null
  if (typeof _key === 'function') {
    try {
      key = _key()
    } catch (err) {
      // dependencies not ready
      key = ''
    }
  } else if (Array.isArray(_key)) {
    // args array
    key = hash(_key)
    args = _key
  } else {
    // convert null to ''
    key = String(_key || '')
  }
  return [key, args]
}

/**
 * 对 fetch 进行封并返回 isLoading、isError、data 三个值
 * @param {*} url 请求的 API 地址
 * @param {*} initialData 初始化数据
 */
function useFetch(url, fetcher, options = {}) {
  // 约定 key 是发送请求的唯一标识符
  // 当 key 可以被改变，当改变时触发请求
  const [key] = getKeyArgs(url)

  // `keyErr` is the cache key for error objects
  const keyErr = getErrorKey(key)

  const config = Object.assign(
    {},
    defaultConfig,
    useContext(useFetchConfigContext),
    options
  )

  let fn = fetcher
  if(typeof fn === 'undefined') {
    // 使用全局的 fetcher
    fn = config.fetcher
  }

  // 优先从缓存获取数据（stale）
  const [data, setData] = useState(cacheGet(key) || undefined)
  const [error, setError] = useState(cacheGet(keyErr) || undefined)

  // 基于 stale-while-revalidate 的思想，这里将 isLoading 命名为 isValidating
  const [isValidating, setIsValidating] = useState(false);

  // error ref inside revalidate (is last request errored?)
  const unmountedRef = useRef(false)
  const keyRef = useRef(key)
  const errorRef = useRef(error)
  const dataRef = useRef(data)

  // 基于 stale-while-revalidate 的思想，这里将 fetchData 命名为 revalidate
  const revalidate = useCallback(
    async () => {
      if(!key) return false
      if (unmountedRef.current) return false

      let loading = true

      try {
        setIsValidating(true)

        // if no cache being rendered currently (it shows a blank page),
        // we trigger the loading slow event.
        if (config.loadingTimeout) {
          setTimeout(() => {
            if (loading) config.onLoadingSlow(key, config)
          }, config.loadingTimeout)
        }

        CONCURRENT_PROMISES[key] = fn(key)

        const newData = await CONCURRENT_PROMISES[key]

        // 请求成功时的回调
        config.onSuccess(newData, key, config)

        cacheSet(key, newData)
        cacheSet(keyErr, undefined)
        keyRef.current = key

        // 批量更新
        unstable_batchedUpdates(() => {
          setIsValidating(false)

          if (typeof errorRef.current !== 'undefined') {
            // we don't have an error
            setError(undefined)
            errorRef.current = undefined
          }

          // 数据改变调用 setData 更新触发 UI 渲染
          setData(newData)
          dataRef.current = newData
        })
      } catch(err) {
        delete CONCURRENT_PROMISES[key]

        cacheSet(keyErr, err)
        keyRef.current = key

        // 请求出错设置错误值
        if (errorRef.current !== err) {
          errorRef.current = err

          unstable_batchedUpdates(() => {
            setIsValidating(false)
            setError(err)
          })
        }

        // 请求失败时的回调
       config.onError(err, key, config)
      }

      loading = false
      return true
    },
    // eslint-disable-next-line
    [key]
  )

  useEffect(() => {
    // 在 key 更新之后，我们需要将其标记为 mounted
    unmountedRef.current = false

    // 当组件挂载（hydrated）后，获取缓存数据进行更新，并触发重新验证
    const currentHookData = dataRef.current
    const latestKeyedData = cacheGet(key)

    // 如果 key 已更改或缓存已更新，则更新状态
    if (
      keyRef.current !== key ||
      !deepEqual(currentHookData, latestKeyedData)
    ) {
      setData(latestKeyedData)
      dataRef.current = latestKeyedData
      keyRef.current = key
    }

    // revalidate with deduping
    const softRevalidate = () => revalidate()

    // 触发验证
    if (
      typeof latestKeyedData !== 'undefined' &&
      window['requestIdleCallback']
    ) {
      // delay revalidate if there's cache
      // to not block the rendering
      window['requestIdleCallback'](softRevalidate)
    } else {
      softRevalidate()
    }

    // whenever the window gets focused, revalidate
    let onFocus
    if (config.revalidateOnFocus) {
      // throttle: avoid being called twice from both listeners
      // and tabs being switched quickly
      onFocus = throttle(softRevalidate, config.focusThrottleInterval)
      if (!FOCUS_REVALIDATORS[key]) {
        FOCUS_REVALIDATORS[key] = [onFocus]
      } else {
        FOCUS_REVALIDATORS[key].push(onFocus)
      }
    }

    // register global cache update listener
    const onUpdate = (
      shouldRevalidate = true,
      updatedData,
      updatedError
    ) => {
      // update hook state
      unstable_batchedUpdates(() => {
        if (
          typeof updatedData !== 'undefined' &&
          !deepEqual(dataRef.current, updatedData)
        ) {
          setData(updatedData)
          dataRef.current = updatedData
        }
        // always update error
        // because it can be `undefined`
        if (errorRef.current !== updatedError) {
          setError(updatedError)
          errorRef.current = updatedError
        }
        keyRef.current = key
      })

      if (shouldRevalidate) {
        return softRevalidate()
      }
      return false
    }

    // add updater to listeners
    if (!CACHE_REVALIDATORS[key]) {
      CACHE_REVALIDATORS[key] = [onUpdate]
    } else {
      CACHE_REVALIDATORS[key].push(onUpdate)
    }

    return () => {
      // mark it as unmounted
      unmountedRef.current = true

      if (onFocus && FOCUS_REVALIDATORS[key]) {
        const index = FOCUS_REVALIDATORS[key].indexOf(onFocus)
        if (index >= 0) FOCUS_REVALIDATORS[key].splice(index, 1)
      }
      if (CACHE_REVALIDATORS[key]) {
        const index = CACHE_REVALIDATORS[key].indexOf(onUpdate)
        if (index >= 0) CACHE_REVALIDATORS[key].splice(index, 1)
      }
    }
  }, [key, revalidate])

  return {data, isValidating, error}
}

const useFetchConfig = useFetchConfigContext.Provider;

export { useFetchConfig };

export default useFetch;
