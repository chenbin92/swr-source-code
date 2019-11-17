import React from 'react'
import App from 'next/app'
import { useFetchConfig as UseFetchConfig } from '../libs/useFetch'
import fetch from '../libs/fetch';

class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props
    return <UseFetchConfig
      value={{
        fetcher: fetch,
      }}
    >
      <Component {...pageProps} />
    </UseFetchConfig>
  }
}

export default MyApp
