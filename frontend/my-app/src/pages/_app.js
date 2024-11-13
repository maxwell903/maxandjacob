// src/pages/_app.js - complete file
import "@/styles/globals.css";
import { NavigationProvider } from '../context/NavigationContext';

export default function App({ Component, pageProps }) {
  return (
    <NavigationProvider>
      <Component {...pageProps} />
    </NavigationProvider>
  );
}