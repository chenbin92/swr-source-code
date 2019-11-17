import { useState, useEffect, useContext } from 'react'
import useFetchConfigContext from './useFetch-config-context'

/**
 * 对 fetch 进行封并返回 isLoading、isError、data 三个值
 * @param {*} url 请求的 API 地址
 * @param {*} initialData 初始化数据
 */
function useFetch(url, fetcher, options = {}) {
  const [data, setData] = useState(undefined)
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false)

  const config = Object.assign(
    {},
    useContext(useFetchConfigContext),
    options
  )

  let fn = fetcher
  if(typeof fn === 'undefined') {
    fn = config.fetcher
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsError(false)
      setIsLoading(true)

      try {
        const newData = await fn(url);
        setData(newData)
      } catch(error) {
        setIsError(false)
      }

      setIsLoading(false)
    }

    fetchData()
  }, [url])

  return [data, isLoading, isError]
}

const useFetchConfig = useFetchConfigContext.Provider;

export { useFetchConfig };

export default useFetch;
