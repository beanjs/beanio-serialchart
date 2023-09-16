import { createApp } from 'vue'
import '@/styles/global.scss'
import App from './App.vue'
import pkg from '../../package.json'

createApp(App).provide('version', pkg.version).mount('#app')
