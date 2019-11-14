import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import fetch from '../libs/fetch'
import Nav from '../components/nav'

const Home = () => {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)

      try {
        const result = await fetch('api/data')
        setData(result)
      } catch(error) {
        setIsError(true)
      }

      setIsLoading(false)
    }

    fetchData()
  }, [])

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
            isLoading ? 'loading...' :
            data.map(project =>
              <p key={project}><Link href='/[user]/[repo]' as={`/${project}`}><a>{project}</a></Link></p>
            )
          }
        </div>
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
