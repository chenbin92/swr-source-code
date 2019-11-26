> 说明：不同的分支对应不同功能的实现，可参照文章逐步实现完整的示例。

# 深入浅出 SWR 原理

本文主要是基于 SWR 源码对其原理进行分析，但并不会直接从源码开始，而是从实际需求场景一步一步推导进而实现 SWR 的功能，如果不了解 SWR 是什么，可以先看上一篇[《SWR：最具潜力的 React Hooks 请求库》](https://zhuanlan.zhihu.com/p/89570321)或者直接看 SWR 的官方介绍文档。

![image.png](https://img.alicdn.com/tfs/TB1UsoYnubviK0jSZFNXXaApXXa-1492-686.png)

<a name="1f950e90"></a>
## 目录

- 需求场景
- 简易模型
- 功能迭代
- [x] 自定义请求
- [x] 全局配置项
- [x] 依赖请求
- [x] 焦点验证
- [x] 其他功能
- 原理分析
- 总结

<a name="shOmB"></a>
## 需求场景

随着 React Hooks 的浪潮，各种基于 Hooks 的方案越来越多，其中主要包含 **状态管理**、**数据请求**、**通用功能的封装 **等等。而 **数据请求** 是日常业务开发中最常见的需求，那么在  Hooks 模式下，我们应该如何请求数据，先来看下面的一个简单示例。

**产品需求**：首页通过接口获取 github trending 项目列表，然后点击列表项可查看单个项目的信息。

![demo.gif](https://img.alicdn.com/tfs/TB1Jyvwobj1gK0jSZFOXXc7GpXa-1425-803.gif)<br />**程序实现**：接到需求后一顿操作，无非就是在数据请求时需要显示 loading 效果，数据获取完成时展示列表数据，以及考虑请求错误后的容错处理，稳健如飞的撸出了如下代码：

```jsx
// 首页列表实现

const Home = () => {
  // 设置初始数据
  const [data, setData] = useState([]) 
  // 设置初始状态
  const [isLoading, setIsLoading] = useState(false)
  // 设置初始错误值
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    // 定义 fetchFn 
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
    // 调用接口
    fetchData()
  }, [])
  
  return (
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
  )
}
```

获取项目详情实现与上面基本一样，基础代码如下：

```jsx
// 项目详情实现
const project = () => {
  const [data, setData] = useState([]) 
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // 获取的 API 带了 id 参数
        const result = await fetch(`api/data?id=${id}`)
        setData(result)
      } catch(error) {
        setIsError(true)
      }
      setIsLoading(false)
    }

    fetchData()
  }, [id])
  
  return ()
}
```

如上面的例子所示，代码看上去很简洁，一个纯函数包含了数据请求时的请求状态、容错处理、数据更新，视图渲染，以及使用了 React 的 `useEffect` 和 `useState`  两个 Hooks API，很好的满足了场景需求。

这看上去很好，但你可能存在一些疑惑，从示例代码可以看到获取项目列表和项目详情的 **数据请求部分的代码 **基本上是一样的，同样的代码重复写两遍，这显然是不能接受的，基于此通常的做法是对其进行一层抽象封装，实现逻辑的复用，具体如下。

<a name="4dBya"></a>
## 简易模型

基于重复的数据请求代码，对比发现只是 API 和初始数据值的不同，其他如设置 `data` ， `isLoading` ， `isError` 的逻辑都是一样，可以先将其进行一层抽象封装以便进行复用，简易模型如下：

```jsx
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
  }, [])

  return [data, isLoading, isError]
}

export default useFetch;

```
<a name="RgpD4"></a>
### 
然后修改我们的业务代码如下，这时视图层只需要一行代码即可完成数据的请求，并返回了 `data` 、 `isLoading` 、 `isError` 三个值，渲染处理逻辑完全一致。

```jsx
// 首页列表实现
const Home = () => {
  const [data, isLoading, isError] = useFetch('api/data', []);
  
  return (
    // render jsx
  )
}

// 项目详情实现
const project = () => {
	const [data, isLoading, isError] = useFetch(`api/data?id=${id}`, []);
  
  return (
    // render jsx
  )
}
```

至此我们的 useFetch API 形式如下，接收 `url`  和 `initialData`  作为参数，返回 `data` 、 `isLoading` 、 `isError`  三个值。

![image.png](https://img.alicdn.com/tfs/TB1fJruokL0gK0jSZFxXXXWHVXa-1138-186.png)

<a name="Perop"></a>
## 功能迭代

上面的代码看起来应该是不错了，通过 useFetch 的封装，在具体的视图中只需要调用 useFetch 传入对应的 API 地址和初始数据，即可正常工作，然而实际的业务场景并不都是如此，接下来将逐步对它进行功能迭代，满足常见的业务开发需求。

<a name="mevks"></a>
### 自定义请求

上面实现的 useFetch 是将 fetch 的实现逻辑进行了内置，且默认使用了 `isomorphic-unfetch` 这个库，在实际业务中，你可能习惯了使用 axios，也可能需要对 fetch 的逻辑进行定制，那么现有的 useFetch 显然就不能满足要求，这时我们可以考虑将 fetch 逻辑通过参数的形式进行传入，外层可以自定义获取数据的行为，如果不传递则默认为 `undefined` 。

```javascript
import { useState, useEffect } from 'react'

// 支持传入 fetcher 用于自定义请求
function useFetch(url, fetcher) {
  const [data, setData] = useState(undefined)
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsError(false)
      setIsLoading(true)

      try {
        // 这里直接调用外部传进来的 fetcher，并使用 url 作为参数
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

这时在组件层获取数据的方式，可自定义请求函数如下：

```javascript
import fetch from 'isomorphic-unfetch'

const customFetch = async (...args) => {
  const res = await fetch(...args)
  return await res.json()
}

const Home = () => {
  // useFetch 的第二个参数可以使用自定义的 customFetch
  const [data, isLoading, isError] = useFetch('api/data', customFetch);
  return ()
}
```

可以看到，useFetch 现在可以接收一个函数用于获取数据，且该函数的唯一参数为 useFetch 的第一个参数 url，这意味着可以使用你喜欢的任何请求库来获取数据。

![image.png](https://img.alicdn.com/tfs/TB158PvokT2gK0jSZPcXXcKkpXa-1088-222.png)


<a name="SsZrI"></a>
### 全局配置项

我们已经可以通过自定义 fetcher 获取数据，但每个调用处都需要重复的去传递 fetcher，因此可以考虑将其统一配置，在调用时可以直接使用该默认配置，也可以自定义配置来覆盖，为此需要一个全局配置的方式。

在 React 中全局配置数据共享最简单的就是通过 Context 方式，这里我们选择使用 useContext 来实现 useFetch 的全局配置功能。

```javascript
import { createContext } from 'react'

const useFetchConfigContext = createContext({})
useFetchConfigContext.displayName = 'useFetchConfigContext'

export default useFetchConfigContext;
```

useFetch 改造如下

```javascript
import { useState, useEffect } from 'react'

function useFetch(url, fetcher, options = {}) {
  const [data, setData] = useState(undefined)
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false)

  // 通过 useContext 获取 useFetchConfigContext 的全局配置
  const config = Object.assign(
    {},
    useContext(useFetchConfigContext),
    options
  )

  let fn = fetcher
  if(typeof fn === 'undefined') {
    // 使用全局配置的 fetcher
    fn = config.fetcher
  }

  useEffect(() => {
    // ...
  }, [url])

  return [data, isLoading, isError]
}

// 导出 useFetchConfig 
const useFetchConfig = useFetchConfigContext.Provider;
export { useFetchConfig };

export default useFetch;
```

现在组件层获取数据的方式如下，在全局统一配置 fetcher，然后在调用 useFetch 的组件中只需要传入对应的 url 即可：

**全局配置**

```jsx
import React from 'react'
import App from 'next/app'
import { useFetchConfig as UseFetchConfig } from '../libs/useFetch'
import fetch from '../libs/fetch';

class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props
    return (
      /* 通过 useFetchConfig 配置全局的 useFetch 参数 */
      <UseFetchConfig value={{ fetcher: fetch }}>
        <Component {...pageProps} />
      </UseFetchConfig>
    )
  }
}
```

**组件调用**

```jsx
const Home = () => {
  const [data, isLoading, isError] = useFetch('api/data');
  return (
    // jsx code
  )
}
```

至此，我们提供了一个全局配置来代替每个调用 useFetch 时的重复逻辑，现在我们的 useFetch 功能如下：

![image.png](https://img.alicdn.com/tfs/TB1hajuoeH2gK0jSZFEXXcqMpXa-1256-402.png)

<a name="nXpdP"></a>
### 依赖请求

除了自定义请求和全局配置，实际业务中另外一类常见需求就是请求之间的依赖，**如 B 依赖 A 的返回结果作为请求参数**，通常的写法如下：

```javascript
const { data: a } = await fetch('/api/a')
const { data: b } = await fetch(`/api/b?id=${a.id}`)
```


那么在 `useFetch`  的模式下该如何处理这类需求，当 `/api/a`  接口未正常返回结果时 `a`  的值为 `undefined` ，在 `/api/b`  接口中调用 `a.id` 就会直接抛出异常，导致页面渲染失败。

**那这是否意味我们可以假设当调用接口时 `url`  这个参数抛出异常，也就意味着它的依赖还没有准备就绪，暂停这个数据的请求；等到依赖项准备就绪时，然后对就绪的数据发起新的一轮请求，以此来解决依赖请求的问题。**

而依赖项准备就绪的时机也就是在任一请求完成时，如上面的 `/api/a`  请求完成时 `useFetch`  会通过 `setState`  触发重新渲染，同时 `/api/b?id=${a.id}` 得到更新，只需要将该 `url`  作为 `useEffect`  的依赖项即可自动监听并触发新一轮的请求。其示意图如下：<br />![image.png](https://img.alicdn.com/tfs/TB1aGLtobr1gK0jSZR0XXbP8XXa-704-290.png)

通过上面的分析， `useFetch`  处理依赖请求的逻辑主要分为以下三步：

1. 约定参数 `url`  可以是一个函数并且该函数返回一个字符串作为请求的唯一标识符；
1. 当调用该函数抛出异常时就意味着它的依赖还没有就绪，将暂停这个请求；
1. 在依赖的请求完成时，通过 `setState`  触发重新渲染，此时 `url`  会被更新，同时通过 `useEffect`  监听 `url`  是否有改变触发新一轮的请求。

```javascript
const Home = () => {
  // A 和 B 两个并行请求，且 B 依赖 A 请求
  const { data: a } = useFetch('/api/a')
  const { data: b } = useFetch(() => `/api/b?id=${a.id}`)

  return ()
}

const useFetch = (url, fetcher, options) => {
  
  const getKeyArgs = _key => {
    let key
    if (typeof _key === 'function') {
      // 核心所在:
      // 当 url 抛出异常时意味着它的依赖还没有就绪则暂停请求
      // 也就是将 key 设置为空字符串
      try {
        key = _key()
      } catch (err) {
        key = ''
      }
    } else {
      // convert null to ''
      key = String(_key || '')
    }
    return key
  }

  useEffect(() => {
    const [data, setData] = useState(undefined)
    const key = getKeyArgs(url)
    const fetchData = async () => {
      try {
        const newData = await fn(key);
        setData(newData)
      } catch(error) {
        // 
      }
    },

    fetchData()
    
  // 核心所在
  // 当 A 请求完成时通过 setData 触发 UI 重新渲染
  // 继而当 url 更新时触发 B 的新一轮请求
  }, [key])

  return {}
}
```


如 SWR 官方文档所描述，允许获取依赖于其他请求的数据，且可以**确保最大程度的并行**（avoiding waterfalls），其原理主要是通过约定 `key` 为一个函数进行 `try {}` 处理 ，并巧妙的结合 React 的 `UI = f(data)` 模型来触发请求，以此确保最大程度的并行。
> SWR also allows you to fetch data that depends on other data. It ensures the maximum possible parallelism (avoiding waterfalls), as well as serial fetching when a piece of dynamic data is required for the next data fetch to happen.


当然在依赖请求过程中，我们可能需要对 `useFetch`  有更多的控制权，比如设置请求的超时时间，以及请求超时需要触发回调，请求成功/失败的回调等。我们可以通过添加第三个参数 `options`  进行传入，完整实现如下：

```javascript
function useFetch(url, fetcher, options = {}) {
  // 从 useContext 获取全局配置和默认配置进行合并，继而和 useFetch 的 options 进行合并
  // 优先级分别是 useFetch > useFetchConfigContext > defaultConfig
  const config = Object.assign(
    {},
    defaultConfig,
    useContext(useFetchConfigContext),
    options
  )

  const key = getKeyArgs(url)

  // 通过 options 设置初始值
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
        // 请求超时触发 onLoadingSlow 回调函数
        if (config.loadingTimeout) {
          setTimeout(() => {
            if (loading) config.onLoadingSlow(key, config)
          }, config.loadingTimeout)
        }

        newData = await fn(key);

        // 触发请求成功时的回调函数
        config.onSuccess && config.onSuccess(newData, key, config)

        // 批量更新
        unstable_batchedUpdates(() => {
          setData(newData)
          setIsLoading(false)
        })
      } catch(error) {
        unstable_batchedUpdates(() => {
          setIsError(true)
          setIsLoading(false)
        })

        // 触发请求失败时的回调函数
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
```


相关技术点：

**unstable_batchedUpdates**

在 React 中某些场景下如果多次调用 setState 则会导致多次的 render，但有些 setState 的渲染是没有必须的，如上述实现代码的 `setData(data)` 和 `setIsLoading(false)` ，因此 react 提供了 `unstable_batchedUpdates`  API 用来批量处理。

```javascript
// 示例来源：Does React keep the order for state updates
import { unstable_batchedUpdates } from 'react-dom';

promise.then(() => {
  // Forces batching
  ReactDOM.unstable_batchedUpdates(() => {
    this.setState({a: true}); // Doesn't re-render yet
    this.setState({b: true}); // Doesn't re-render yet
    this.props.setParentState(); // Doesn't re-render yet
  });
  // When we exit unstable_batchedUpdates, re-renders once
});
```

**useCallback**<br />**<br />对事件句柄进行缓存，如 useState 的第二个返回值是更新函数 setState，但是每次都是返回新的，使用 useCallback 可以让它使用上次的函数。useCallback 接收内联回调函数以及依赖项数组作为参数，该回调函数仅在某个依赖项改变时才会更新。

```javascript
const memoizedCallback = useCallback(
  () => {
    doSomething(a, b);
  },
  
  // a, b 更新时才会调用回调函数
  [a, b],
);
```

到这里 `useFetch`  的 API 形式如下，已经支持传入请求的 `url` 、自定义的 `fetcher` 、以及一些可选的配置项。 

![image.png](https://img.alicdn.com/tfs/TB14avroXT7gK0jSZFpXXaTkpXa-1238-366.png)

<a name="Gk33E"></a>
### 聚焦验证

React 团队在前不久的 React Conf 上发布了关于 `Concurrent`  模式的实验性文档，如果说 React Hooks 目的是提高开发体验，那么 `Concurrent`  模式则专注于提升用户体验。同样对于一个基于 React Hook 的请求库而言，除了提供强大的功能之外，提升用户体验也是需要考虑的能力之一。

`stale-while-revalidate`  是 HTTP 的缓存策略值之一，其核心就是**允许客户端先使用缓存中不新鲜的数据**，**然后在后台异步重新验证更新缓存**，等下次使用的时候数据就是新鲜的了，旨在通过缓存提高用户体验。

![image.png](https://img.alicdn.com/tfs/TB157zsokP2gK0jSZPxXXacQpXa-1492-747.png)<br />如上图所示，在 `useFetch` 中也可以借鉴这种缓存机制，如在请求之前先从缓存返回数据（stale），然后在异步发送请求，最后当数据返回时更新缓存并触发 UI 的重新渲染，从而提高用户体验。这里以鼠标聚焦页面时先从缓存获取数据然后异步请求更新为例，来看看具体的实现。

基于上面的分析，我们首先需要将所有请求的数据结果在内存中进行缓存，来模拟 stale-while-revalidate 的缓存效果，可以利用 ES6 的 `new Map()` 来实现，以 `{[key]: [value]}`  的形式记录请求的数据结果，设计如下：

```javascript
const __cache = new Map()

function cacheGet(key) {
  return __cache.get(key) || undefined
}

function cacheSet(key, value) {
  return __cache.set(key, value)
}

function cacheClear() {
  __cache.clear()
}
```

同时，需要记录异步请求的集合，用来根据不同的 `key`  触发对应的验证函数， 以  `{[key]: [revalidate]}` 的形式进行记录请求集合，设计如下：

```javascript
// 记录并发的请求函数集合
const CONCURRENT_PROMISES = {}

// 记录聚焦的验证函数集合
const FOCUS_REVALIDATORS = {}

// 记录缓存中的验证函数集合
const CACHE_REVALIDATORS = {}
```

完整的代码实现如下：
> 基于 `stale-while-revalidate`  的思想, 这里将 `useFetch`  命名为 `useSWR` ，同时将原有的 `isLoading`  命名为 `isValidating` ，将数据请求函数 `fetchData` 命名为 `revalidate` .


```javascript
// 基于 stale-while-revalidate 的思想, 这里将 useFetch 命名为 useSWR
function useSWR(url, fetcher, options = {}) {
  // 约定 `key` 是发送请求的唯一标识符
  // key 可以被改变，当改变时触发请求
  const [key] = getKeyArgs(url)
  
  // `keyErr`是错误对象的缓存键
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

  // 通过 useState 设置 data | error  的初始值，优先从缓存获取数据（stale data）
  const [data, setData] = useState(cacheGet(key) || undefined)
  const [error, setError] = useState(cacheGet(keyErr) || undefined)

  // 基于 stale-while-revalidate 的思想，这里将 isLoading 命名为 isValidating
  const [isValidating, setIsValidating] = useState(false);

  // useRef 可以用来存储任何会改变的值，解决了在函数组件上不能通过实例去存储数据的问题。另外还可以 useRef 来访问到改变之前的数据
  const unmountedRef = useRef(false)
  const keyRef = useRef(key)
  const errorRef = useRef(error)
  const dataRef = useRef(data)

  // 基于 stale-while-revalidate 的思想，这里将 fetchData 命名为 revalidate
  // 当依赖项 key 变化时 useCallback 会重新执行
  const revalidate = useCallback(
    async () => {
      if(!key) return false
      if (unmountedRef.current) return false

      let loading = true

      try {
        setIsValidating(true)

        // 请求超时触发 onLoadingSlow 回调函数
        if (config.loadingTimeout) {
          setTimeout(() => {
            if (loading) config.onLoadingSlow(key, config)
          }, config.loadingTimeout)
        }

        // 将请求记录到 CONCURRENT_PROMISES 对象
        CONCURRENT_PROMISES[key] = fn(key)

        // 执行请求
        const newData = await CONCURRENT_PROMISES[key]

        // 请求成功时的回调
        config.onSuccess(newData, key, config)

        // 将请求结果存储到缓存 cache 中
        cacheSet(key, newData)
        cacheSet(keyErr, undefined)
        keyRef.current = key

        // 批量更新
        unstable_batchedUpdates(() => {
          setIsValidating(false)

          if (typeof errorRef.current !== 'undefined') {
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
      // 如果有缓存则延迟重新验证，优先使用缓存数据进行渲染
      window['requestIdleCallback'](softRevalidate)
    } else {
      // 没有缓存则执行验证
      softRevalidate()
    }

    // 每当窗口聚焦时，重新验证
    let onFocus
    if (config.revalidateOnFocus) {
      // 节流：避免快速切换标签页重复调用
      onFocus = throttle(softRevalidate, config.focusThrottleInterval)
      if (!FOCUS_REVALIDATORS[key]) {
        FOCUS_REVALIDATORS[key] = [onFocus]
      } else {
        FOCUS_REVALIDATORS[key].push(onFocus)
      }
    }

    // 注册全局缓存的更新监听函数
    const onUpdate = (
      shouldRevalidate = true,
      updatedData,
      updatedError
    ) => {
      // 批量更新
      unstable_batchedUpdates(() => {
        if (
          typeof updatedData !== 'undefined' &&
          !deepEqual(dataRef.current, updatedData)
        ) {
          setData(updatedData)
          dataRef.current = updatedData
        }

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

    // 将更新函数添加到监听队列
    if (!CACHE_REVALIDATORS[key]) {
      CACHE_REVALIDATORS[key] = [onUpdate]
    } else {
      CACHE_REVALIDATORS[key].push(onUpdate)
    }

    return () => {
      // 清除副作用的相关逻辑
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
```

相关技术点：

**requestIdleCallback**<br />**<br />在 React 16 实现了新的调度策略(Fiber)，新的调度策略提到的异步、可中断，其实就是基于浏览器的 requestIdleCallback 和 requestAnimationFrame 两个API，在 useSWR 中也是使用了 requestIdleCallback 这个 API，其作用就是在前浏览器处于空闲状态的时候执相对较低的任务，也即传给 requestIdleCallback 的回调函数，可以看到在 useSWR 中验证函数作为 requestIdleCallback 的回调函数，如果有缓存则延迟重新验证，优先使用缓存数据进行渲染。

```javascript
// 触发验证
if (
  typeof latestKeyedData !== 'undefined' &&
  window['requestIdleCallback']
) {
  // 如果有缓存则延迟重新验证，优先使用缓存数据进行渲染
  window['requestIdleCallback'](softRevalidate)
} else {
  // 没有缓存则执行验证
  softRevalidate()
}
```

**聚焦验证**<br />**<br />有了上面的分析，聚焦验证就很好实现了，主要是通过判断窗口的可见性来触发验证请求：

判断窗口是否可见:

```javascript
export default function isDocumentVisible() {
  if (
    typeof document !== 'undefined' &&
    typeof document.visibilityState !== 'undefined'
  ) {
    return document.visibilityState !== 'hidden'
  }
  // always assume it's visible
  return true
}
```

绑定监听窗口状态触发验证：

```javascript
// Focus revalidate
let eventsBinded = false
if (typeof window !== 'undefined' && window.addEventListener && !eventsBinded) {
  const revalidate = () => {
    if (!isDocumentVisible() || !isOnline()) return

    // eslint-disable-next-line
    for (let key in FOCUS_REVALIDATORS) {
      if (FOCUS_REVALIDATORS[key][0]) FOCUS_REVALIDATORS[key][0]()
    }
  }
  window.addEventListener('visibilitychange', revalidate, false)
  window.addEventListener('focus', revalidate, false)
  // only bind the events once
  eventsBinded = true
}
```

<a name="oe1e7"></a>
### 其他功能

在 useSWR 官网中，可以看到还有其他诸如支持 Interval polling、Suspense Mode、Local Mutation 等的能力，但了解其原理之后我们知道其本质都是通过不同的条件和时机来触发验证进行实现的，这里不再一一分析。另外有趣的是由于 useSWR 是 nextjs 的相关团队出品，其也支持了 SSR 能力，以及做了针对服务端的一些特殊处理，如在 useSWR 中判断是服务端的时候使用的 `useLayoutEffect` ， `Suppense` 模式尽在客户端使用等。

```javascript
// React currently throws a warning when using useLayoutEffect on the server.
  // To get around it, we can conditionally useEffect on the server (no-op) and
  // useLayoutEffect in the browser.
  const useIsomorphicLayoutEffect = IS_SERVER ? useEffect : useLayoutEffect

  // mounted (client side rendering)
  useIsomorphicLayoutEffect(() => {
  
    // suspense
  if (config.suspense) {
    if (IS_SERVER)
      throw new Error('Suspense on server side is not yet supported!')
  })
```


<a name="KLdzc"></a>
## 核心原理

下面是基于源码画的一张 SWR 的流程图，用来汇总上述的源码分析过程，链接其核心主要分三个阶段：

1. 在调用 `useSWR()` 时获取缓进行数据初始化阶段；
1. 在 `useIsomorphicLayoutEffect` 时如果有缓存则优先使用缓存数据，然后异步调用 `revalidate` 进行数据验证并更新缓存数据阶段；
1. 在 `useIsomorphicLayoutEffect` 时调用 `unstable_batchedUpdates`  渲染视图阶段。

![image.png](https://img.alicdn.com/tfs/TB1eYYtobr1gK0jSZR0XXbP8XXa-1261-1046.png)
<a name="7Oj2Z"></a>
## 总结

通过上面的分析，相比社区的现有请求类库，useSWR 除了提供常见的功能之外，其核心在于借鉴了 `stale-while-revalidate` 缓存的思想，并与 React Hooks 进行结合，优先从缓存中获取数据保证的 UI 的快速渲染， 然后在后台异步重新验证更新缓存，一旦缓存得到更新，利用 setState 的机制又会重新触发 UI 的渲染，这意味着组件将得到一个不断地自动更新的数据流，来确保数据的新鲜性。

另外，更强大的是由于 useSWR 缓存的是所有异步请求的数据，本质上相当于拥有了 Global Store 的能力，间接的提供了一种 **状态管理 **的方案；而事实上，useSWR 除了异步请求数据之外，也可以通过同步的方式往缓存中写入数据，满足组件之间的状态同步需求。目前官方还未将这一能力在其文档释放出来，但 @偏右 已经提交了一个示例 [local-state-sharing](https://github.com/zeit/swr/blob/master/examples/local-state-sharing) 演示其可行性。这意味着在某些场景下，我们也许并不需要诸如 Redux / mobx / unstated-next / icestore/dva/ React Context 等等状态管理库。

在未来，也许我们可以这样玩，将 **数据请求 **和 **状态管理 **合二为一，大致的脑图如下：<br />![image.png](https://img.alicdn.com/tfs/TB1RsfroXT7gK0jSZFpXXaTkpXa-2060-1490.png)

<a name="va6qC"></a>
## 参考

- [How to fetch data with React Hooks?](https://www.robinwieruch.de/react-hooks-fetch-data)
- [Two HTTP Caching Extensions](https://www.mnot.net/blog/2007/12/12/stale)
- [离线指南 - stale-while-revalidate](https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook/?hl=zh-CN#stale-while-revalidate)
- [SWR 与前端数据依赖请求](https://zhuanlan.zhihu.com/p/90660704)

