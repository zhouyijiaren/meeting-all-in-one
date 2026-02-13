/**
 * Vite 构建下替代 expo-router 的兼容层，使用 react-router-dom 实现相同 API。
 * 仅在 Web Vite 构建时通过 alias 使用；Expo/Metro 仍用真实 expo-router。
 */
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

const navigateRef = { current: null };

export function useLocalSearchParams() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const fromSearch = Object.fromEntries(searchParams.entries());
  return { ...params, ...fromSearch };
}

function pathFromRoute(pathname, params) {
  if (!params || typeof pathname !== 'string') return pathname;
  let path = pathname;
  const rest = { ...params };
  const dynamic = [
    ['[id]', 'id'],
    ['[shortCode]', 'shortCode'],
  ];
  for (const [placeholder, key] of dynamic) {
    if (path.includes(placeholder) && rest[key] != null) {
      path = path.replace(placeholder, encodeURIComponent(rest[key]));
      delete rest[key];
    }
  }
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(rest)) {
    if (v != null && v !== '') query.set(k, String(v));
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

export const router = {
  push({ pathname, params }) {
    const to = pathFromRoute(pathname, params);
    if (navigateRef.current) navigateRef.current(to);
  },
  replace({ pathname, params }) {
    const to = pathFromRoute(pathname, params);
    if (navigateRef.current) navigateRef.current(to, { replace: true });
  },
};

export function setRouterNavigate(navigate) {
  navigateRef.current = navigate;
}

// expo-router 其它可能用到的导出（按需补充）
export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (opts) => router.push(opts),
    replace: (opts) => router.replace(opts),
    back: () => navigate(-1),
  };
}
