import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { transformWithEsbuild } from 'vite';

// 对含 JSX 的 .js 先用 esbuild 转成可解析的 JS，避免 rollup 解析报错
function jsxJsPlugin() {
  return {
    name: 'jsx-js',
    enforce: 'pre',
    async transform(code, id) {
      if (!/\.js$/.test(id) || id.includes('node_modules')) return null;
      if (!/<\s*[A-Za-z]/.test(code)) return null;
      const out = await transformWithEsbuild(code, id, { loader: 'tsx', jsx: 'automatic' });
      return { code: out.code, map: out.map };
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  return {
  root: __dirname,
  publicDir: 'public',
  plugins: [
    jsxJsPlugin(),
    react({ include: /\.(jsx|js|tsx|ts)$/, jsxRuntime: 'automatic' }),
    {
      name: 'resolve-codegen',
      resolveId(id) {
        if (id === 'react-native/Libraries/Utilities/codegenNativeComponent' || id.endsWith('codegenNativeComponent')) {
          return path.resolve(__dirname, 'src/web/stubs/codegenNativeComponent.js');
        }
      },
    },
  ],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'react-native/': 'react-native-web/',
      'react-native/Libraries/Utilities/codegenNativeComponent': path.resolve(__dirname, 'src/web/stubs/codegenNativeComponent.js'),
      'expo-router': path.resolve(__dirname, 'src/web/routerCompat.jsx'),
      'expo-status-bar': path.resolve(__dirname, 'src/web/stubs/expo-status-bar.js'),
      'expo-constants': path.resolve(__dirname, 'src/web/stubs/expo-constants.js'),
      'expo-linking': path.resolve(__dirname, 'src/web/stubs/expo-linking.js'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    __DEV__: mode === 'development',
    'process.env.EXPO_PUBLIC_API_URL': JSON.stringify(env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'),
    'process.env.EXPO_PUBLIC_SOCKET_URL': JSON.stringify(env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001'),
    'process.env.EXPO_PUBLIC_SUPABASE_URL': JSON.stringify(env.EXPO_PUBLIC_SUPABASE_URL || ''),
    'process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''),
    'process.env.EXPO_PUBLIC_TURN_URL': JSON.stringify(env.EXPO_PUBLIC_TURN_URL || ''),
    'process.env.EXPO_PUBLIC_TURN_USERNAME': JSON.stringify(env.EXPO_PUBLIC_TURN_USERNAME || ''),
    'process.env.EXPO_PUBLIC_TURN_CREDENTIAL': JSON.stringify(env.EXPO_PUBLIC_TURN_CREDENTIAL || ''),
    'process.env.EXPO_PUBLIC_FORCE_TURN': JSON.stringify(env.EXPO_PUBLIC_FORCE_TURN || ''),
  },
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index-vite.html'),
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react';
          if (id.includes('node_modules/@react-navigation') || id.includes('node_modules/react-navigation')) return 'react-navigation';
          if (id.includes('node_modules/expo-')) return 'expo';
          // react-native-web 打成一个 chunk，避免拆包后 StyleSheet 与 View/Text 等加载顺序导致 create 报错
          if (id.includes('react-native-web')) return 'react-native-web';
        },
      },
    },
    sourcemap: false,
  },
  server: {
    port: 8080,
    open: true,
  },
};
});
