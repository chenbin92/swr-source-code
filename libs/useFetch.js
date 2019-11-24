import { useState, useEffect, useContext, useCallback } from 'react'
import useFetchConfigContext from './useFetch-config-context'
import { unstable_batchedUpdates } from './reactBatchedUpdates'
import hash from '../utils/hash'

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
  const config = Object.assign(
    {},
    useContext(useFetchConfigContext),
    options
  )

  const [key, fnArgs] = getKeyArgs(url)

  let fn = fetcher
  if(typeof fn === 'undefined') {
    fn = config.fetcher
  }

  const [data, setData] = useState(options.initialData)
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false)

  const fetchData = useCallback(
    async () => {
      if(!key) return false
      setIsLoading(true)

      let loading = true

      let newData

      try {
        // if no cache being rendered currently (it shows a blank page),
        // we trigger the loading slow event.
        if (config.loadingTimeout) {
          setTimeout(() => {
            if (loading) config.onLoadingSlow(key, config)
          }, config.loadingTimeout)
        }

        newData = await fn(key);

        // trigger the success event,
        // only do this for the original request.
        config.onSuccess && config.onSuccess(newData, key, config)

        // batch state updates
        unstable_batchedUpdates(() => {
          setData(newData)
          setIsLoading(false)
        })
      } catch(error) {
        unstable_batchedUpdates(() => {
          setIsError(true)
          setIsLoading(false)
        })

        // events and retry
        config.onError && config.onError(error, key, config)
      }

      loading = false
      return true
    },
    // eslint-disable-next-line
    [key]
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {data, isLoading, isError}
}

const useFetchConfig = useFetchConfigContext.Provider;

export { useFetchConfig };

export default useFetch;
