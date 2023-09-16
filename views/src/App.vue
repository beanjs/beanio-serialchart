<template>
  <div class="ion-flex ion-flex-column">
    <div class="charts-container" ref="chartContainerRef">
      <div class="chart-container" v-for="i of chartsRef" :style="`height:${chartHeight}px`">
        <v-chart :ref="`chartRef_${i}`" :option="option" autoresize></v-chart>
      </div>
    </div>
    <div class="logger-container">
      <logger v-model:running="chartReady" ref="loggerRef"></logger>
    </div>
  </div>
</template>
<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import type { ECharts, LineSeriesOption } from 'echarts'
import { LegendComponent, TooltipComponent, GridComponent, DataZoomComponent } from 'echarts/components'
import VChart from 'vue-echarts'

import Logger, { LoggerExpose } from '@/components/Logger.vue';
import { ref, onMounted, onUnmounted, getCurrentInstance, nextTick } from 'vue'

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  LegendComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent
])

const win: any = window
const ins = getCurrentInstance()
const chartContainerRef = ref<any>()
const loggerRef = ref<LoggerExpose | null>(null)
const chartsRef = ref<number>(0)
const chartMax = 2
const chartDataMax = 6000
const chartHeight = ref<number>(100)
const chartSeries = ref<LineSeriesOption[][]>([])
const chartReady = ref<boolean>(false)

const option = {
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      animation: false
    }
  },
  legend: {
    show: true,
  },
  grid: [{
    left: '0%',
    right: '48px'
  }],
  dataZoom: [
    {
      show: true,
      realtime: true,
      orient: 'vertical'
    },
    {
      type: 'inside',
      realtime: true,
      orient: 'vertical'
      // xAxisIndex: [0, 1]
    }
  ],
  xAxis: {
    type: 'category',
    axisLabel: {
      show: false,
    }
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      inside: true,
    },
  },
  // series: [
  //   {
  //     name: '111',
  //     type: 'line',
  //     showSymbol: false,
  //     data: []
  //   }
  // ]
};

const findChart = async (idx: number) => {
  const refs = ins?.refs[`chartRef_${idx}`] as ECharts[]
  return refs[0]
}

const resizeChart = async () => {
  chartHeight.value = chartContainerRef.value.clientHeight / chartsRef.value
}

const initMultipleChart = async (series: string[][]) => {
  chartSeries.value = []
  const len = Math.min(series.length, chartsRef.value)

  for (let i = 0; i < len; i++) {
    const chart = await findChart(i + 1)
    const _series = series[i]
    chartSeries.value.push([])


    chart.setOption({
      series: _series.map((v: string) => {
        const cs = chartSeries.value[i]
        cs.push({
          data: []
        })

        return {
          name: v,
          type: 'line',
          showSymbol: false,
          data: []
        }
      })
    })
  }
}

const updateMultipleChart = async (data: Array<Array<number> | null>) => {
  const len = Math.min(data.length, chartsRef.value)
  for (let i = 0; i < len; i++) {
    const chart = await findChart(i + 1)
    const _data = data[i]
    if (!_data) continue;

    const cs = chartSeries.value[i]
    for (let j = 0; j < _data.length; j++) {
      const c = cs[j]

      const cl = c.data?.length as number
      if (cl > chartDataMax) {
        c.data?.shift()
      }

      c.data?.push(_data[j])
    }

    chart.setOption({
      series: cs
    })
  }
}

onMounted(() => {
  win.$runtime = {
    info: loggerRef.value?.info,
    warn: loggerRef.value?.warn,
    error: loggerRef.value?.error,

    series: [],

    ondata: (line: string) => {
      loggerRef.value?.info(line)
    },
    onstart: () => {
      loggerRef.value?.info('--start runtime--')
    },
    onstop: () => {
      loggerRef.value?.info('--stop runtime--')
    }
  }

  window.addEventListener('message', async (e: any) => {
    const { action, data } = e.data

    try {
      if (action == 'eval') {
        eval(data)

        const runtime = win.$runtime
        const series = Array.isArray(runtime.series[0]) ? runtime.series : [runtime.series]
        chartsRef.value = series.length
        if (chartsRef.value > chartMax) chartsRef.value = chartMax
        await resizeChart()

        nextTick(async () => {
          await initMultipleChart(series)

          if (runtime.onstart) {
            await runtime.onstart()
          }

          chartReady.value = true
        })
      } else if (action == 'recv') {
        const runtime = win.$runtime
        if (runtime.ondata && chartReady.value) {
          const res = await runtime.ondata(data)
          if (!res) return
          const raws = chartsRef.value == 1 ? [res] : res;
          updateMultipleChart(raws)
        }
      }
    } catch (e) {
      console.log(e)
      loggerRef.value?.error(e as string)
    }
  })

  window.addEventListener('resize', resizeChart)
})

onUnmounted(async () => {
  chartReady.value = false

  const runtime = win.$runtime
  if (runtime.onstop) {
    await runtime.onstop()
  }
})

</script>
<style lang="scss">
.charts-container {
  height: 0;
  flex-grow: 3;
}

.logger-container {
  height: 0;
  flex-grow: 1;
}
</style>