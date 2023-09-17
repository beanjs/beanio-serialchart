<template>
  <div class="container">
    <div class="control-container">
      <button @click="onClick">{{ props.running ? 'Stop' : 'Start' }}</button>
      <select v-model="levelRef">
        <option value="info">info</option>
        <option value="warn">warn</option>
        <option value="error">error</option>
      </select>
      <span>
        <input type="checkbox" v-model="scrollRef">
        <span>Scrollable</span>
      </span>
    </div>
    <div class="message-container" ref="containerRef">
      <div v-for="line of lines" :style="`color:${color(line.level)}`">
        <span>{{ format(line.timestanp) }}</span>
        <span class="message">{{ line.message }}</span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, nextTick } from 'vue'

export interface LoggerProps {
  running: boolean,
  lineMax: number
}

export interface LoggerExpose {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

export interface LoggerItem {
  level: string,
  timestanp: Date,
  message: string
}

const emits = defineEmits(['update:running'])
const props = defineProps<LoggerProps>()
const lines = ref<LoggerItem[]>([])
const levelRef = ref<string>('info')
const scrollRef = ref<boolean>(true)
const containerRef = ref<any>()

const format = (dt: Date) => {
  const hour = dt.getHours().toString()
  const minu = dt.getMinutes().toString()
  const secd = dt.getSeconds().toString()

  return `[${hour.padStart(2, '0')}:${minu.padStart(2, '0')}:${secd.padStart(2, '0')}]`
}

const color = (level: string) => {
  if (level == 'warn') return '#ffc409'
  if (level == 'error') return '#eb445a'
  return '#000000'
}

const l2n = (level: string) => {
  const lvs = ['error', 'warn', 'info']
  return lvs.findIndex((v) => v == level)
}

const log = (msg: string, level: string) => {
  const ln = l2n(level)
  const sln = l2n(levelRef.value)
  if (ln > sln) return

  if (lines.value.length > props.lineMax) {
    lines.value.shift()
  }

  lines.value.push({
    level: level || 'info',
    timestanp: new Date,
    message: msg
  })

  nextTick(() => {
    if (!scrollRef.value) return
    containerRef.value.scrollTop = containerRef.value.scrollHeight - containerRef.value.offsetHeight + 5
  })
}

const info = (msg: string) => {
  log(msg, 'info')
}

const warn = (msg: string) => {
  log(msg, 'warn')
}

const error = (msg: string) => {
  log(msg, 'error')
}

const onClick = async () => {
  const ns = !props.running
  emits('update:running', ns)
}

defineExpose<LoggerExpose>({
  info,
  warn,
  error
})

</script>

<style lang="scss" scoped>
.container {
  margin-top: 0.5rem;
  padding: 0.5rem;
  height: calc(100% - 1.5rem);
  display: flex;
  flex-direction: column;

  .control-container {
    padding: 0.5rem 0;
    display: flex;
    flex-direction: row;
    align-items: center;

    button {
      margin-right: 0.5rem;
    }

    select {
      width: 100px;
    }

    input {
      margin-left: 0.5rem;
    }
  }

  .message-container {
    flex-grow: 1;
    border: 1px solid #cccccc;
    overflow-y: scroll;

    .message {
      padding-left: 0.25rem;
    }
  }
}
</style>