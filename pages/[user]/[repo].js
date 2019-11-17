import React from 'react'
import Link from 'next/link'
import useFetch from '../../libs/useFetch'

export default () => {
  const id = typeof window !== 'undefined' ? window.location.pathname.slice(1) : ''
  const [data, isLoading, isError] = useFetch(`/api/data?id=${id}`)

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>{id}</h1>
      {isError && <div>Something went wrong ...</div>}
      {
        isLoading ? 'loading...' :
        <div>
          <p>forks: {data && data.forks_count}</p>
          <p>stars: {data && data.stargazers_count}</p>
          <p>watchers: {data && data.watchers}</p>
        </div>
      }
      <br />
      <br />
      <Link href="/"><a>Back</a></Link>
    </div>
  )
}
