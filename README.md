## 自定义请求

```js
import { useState, useEffect } from 'react'

/**
 * 对 fetch 进行封并返回 isLoading、isError、data 三个值
 * @param {*} url 请求的 API 地址
 * @param {*} initialData 初始化数据
 */
function useFetch(url, fetcher) {
  const [data, setData] = useState(undefined)
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsError(false)
      setIsLoading(true)

      try {
        // 这里直接调用外部传进来的 fetcher
        const newData = await fetcher(url);
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

```


## 问题

1. 第二个参数 fetcher 是可以选的，但是如果只传递第一个参数貌似没什么含义？
2. 如何处理 initState 的问题？
