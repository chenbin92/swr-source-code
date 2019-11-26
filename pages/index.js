import React from 'react'
import Link from 'next/link'
import Head from 'next/head'
import useFetch from '../libs/useFetch'
import Nav from '../components/nav'

const Home = () => {
  const {data = [], isValidating,isError} = useFetch('api/data', undefined, {
    initialData: [],
    onSuccess: (...args) => console.log('onSuccess:', args),
  })
  const {data: repo} = useFetch(() => `/api/data?id=${data[0]}`, undefined, {
    loadingTimeout: 3000,
    onLoadingSlow: (...args) => console.log('onLoadingSlow:', args),
    onSuccess: (...args) => console.log('onSuccess:', args),
    onError: (...args) => console.log('onError:', args)
  })

  return (
    <div>
      <Head>
        <title>Home</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <Nav />

      <div className='hero'>
        <h1 className='title'>Trending Projects</h1>
        {isError && <div>Something went wrong ...</div>}
        <div>
          {
            isValidating ? 'loading...' :
            data.map(project =>
              <p key={project}><Link href='/[user]/[repo]' as={`/${project}`}><a>{project}</a></Link></p>
            )
          }
        </div>

        {
          repo ?
          <div className='detail'>
            <h4>{repo.full_name}</h4>
            <p>forks: {repo.forks_count}</p>
            <p>stars: {repo.stargazers_count}</p>
            <p>watchers: {repo.watchers}</p>
          </div>
          : null
        }
      </div>

      <style jsx>{`
        .hero {
          width: 100%;
          color: #333;
          text-align: center;
        }
        .title {
          margin: 0;
          width: 100%;
          padding: 80px 0 20px;
          line-height: 1.15;
          font-size: 20px;
        }
        .title,
        .description {
          text-align: center;
        }
        .row {
          max-width: 880px;
          margin: 80px auto 40px;
          display: flex;
          flex-direction: row;
          justify-content: space-around;
        }
        .card {
          padding: 18px 18px 24px;
          width: 220px;
          text-align: left;
          text-decoration: none;
          color: #434343;
          border: 1px solid #9b9b9b;
        }
        .card:hover {
          border-color: #067df7;
        }
        .card h3 {
          margin: 0;
          color: #067df7;
          font-size: 18px;
        }
        .card p {
          margin: 0;
          padding: 12px 0 0;
          font-size: 13px;
          color: #333;
        }
      `}</style>
    </div>
  )
}

export default Home
