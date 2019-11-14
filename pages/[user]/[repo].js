import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import fetch from '../../libs/fetch'

export default () => {
  const id = typeof window !== 'undefined' ? window.location.pathname.slice(1) : ''
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsError(false);
      setIsLoading(true)

      try {
        const result = await fetch(`/api/data?id=${id}`)
        setData(result)
      } catch(error) {
        setIsError(true)
      }

      setIsLoading(false)
    }

    fetchData()
  }, [id])

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>{id}</h1>
      {isError && <div>Something went wrong ...</div>}
      {
        isLoading ? 'loading...' :
        <div>
          <p>forks: {data.forks_count}</p>
          <p>stars: {data.stargazers_count}</p>
          <p>watchers: {data.watchers}</p>
        </div>
      }
      <br />
      <br />
      <Link href="/"><a>Back</a></Link>
    </div>
  )
}
