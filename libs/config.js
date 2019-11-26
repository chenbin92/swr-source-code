import ms from 'ms'
import isDocumentVisible from './is-document-visible'
import isOnline from './is-online'

// Cache
const __cache = new Map()

console.log('cache:', __cache);

function cacheGet(key) {
  return __cache.get(key) || undefined
}

function cacheSet(key, value) {
  return __cache.set(key, value)
}

function cacheClear() {
  __cache.clear()
}

// 记录并发的 promises 集合
const CONCURRENT_PROMISES = {}

// 记录并发的 promises 时间集合
const CONCURRENT_PROMISES_TS = {}

// 记录聚焦的验证函数集合
const FOCUS_REVALIDATORS = {}

// 记录缓存中的验证函数集合
const CACHE_REVALIDATORS = {}

console.log({CONCURRENT_PROMISES});
console.log({FOCUS_REVALIDATORS});
console.log({CACHE_REVALIDATORS});


const defaultConfig = {
  // events
  onLoadingSlow: () => {},
  onSuccess: () => {},
  onError: () => {},

  loadingTimeout: ms('3s'),
  focusThrottleInterval: ms('5s'),

  revalidateOnFocus: true,
}

if (typeof window !== 'undefined') {
  // client side: need to adjust the config
  // based on the browser status

  // slow connection (<= 70Kbps)
  if (navigator.connection) {
    if (
      ['slow-2g', '2g'].indexOf(navigator.connection.effectiveType) !== -1
    ) {
      defaultConfig.errorRetryInterval = ms('10s')
      defaultConfig.loadingTimeout = ms('5s')
    }
  }
}

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

export {
  CONCURRENT_PROMISES,
  CONCURRENT_PROMISES_TS,
  FOCUS_REVALIDATORS,
  CACHE_REVALIDATORS,
  cacheGet,
  cacheSet,
  cacheClear
}

export default defaultConfig;
