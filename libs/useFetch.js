import { useState, useEffect } from 'react'
import fetch from 'isomorphic-unfetch'

/**
 * 对 fetch 进行封并返回 isLoading、isError、data 三个值
 * @param {*} url 请求的 API 地址
 * @param {*} initialData 初始化数据
 */
function useFetch(url, initialData) {
  const [data, setData] = useState(initialData)
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsError(false)
      setIsLoading(true)

      try {
        const result = await fetch(url)
        const newData = await result.json()
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

export default useFetch;
