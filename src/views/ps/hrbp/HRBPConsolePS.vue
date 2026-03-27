<template>
  <div class="ps-page">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">流程触发控制台</div>
        <div class="ps-page__subtitle">作为 PS 风格下的辅助页，以表格和状态操作展示流程测试能力。</div>
      </div>
    </div>

    <section class="ps-panel">
      <div class="ps-toolbar">
        <a-button size="small" type="primary" :disabled="!selectedKeys.length" @click="batchTrigger(true)">批量开启转正</a-button>
        <a-button size="small" danger :disabled="!selectedKeys.length" @click="batchTrigger(false)">批量挂起</a-button>
        <span class="ps-note" v-if="selectedKeys.length">已选择 {{ selectedKeys.length }} 项</span>
      </div>

      <table class="ps-table">
        <thead>
          <tr>
            <th style="width: 56px">
              <input type="checkbox" :checked="allSelected" @change="toggleAll($event)" />
            </th>
            <th>员工</th>
            <th>当前状态</th>
            <th>经理评价</th>
            <th>HRBP评价</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in targetRows" :key="item.master_id">
            <td>
              <input type="checkbox" :checked="selectedKeys.includes(item.master_id)" @change="toggleOne(item.master_id)" />
            </td>
            <td>{{ item.emp_name }}</td>
            <td>{{ item.probation_status }}</td>
            <td>{{ item.manager_eval_done ? '已完成' : '未完成' }}</td>
            <td>{{ item.hrbp_eval_done ? '已完成' : '未完成' }}</td>
            <td class="ps-table__actions">
              <a-button size="small" @click="handleRun(item.master_id)">开启转正</a-button>
              <a-button size="small" danger @click="handleHold(item.master_id)">挂起</a-button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useProbationStore } from '@/store/probation'

const store = useProbationStore()
const selectedKeys = ref<string[]>([])

const targetRows = computed(() => store.records.filter(item => ['04', '05', '06', '09', '99'].includes(item.probation_status)))
const allSelected = computed(() => !!targetRows.value.length && selectedKeys.value.length === targetRows.value.length)

function toggleOne(masterId: string) {
  selectedKeys.value = selectedKeys.value.includes(masterId)
    ? selectedKeys.value.filter(item => item !== masterId)
    : [...selectedKeys.value, masterId]
}

function toggleAll(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  selectedKeys.value = checked ? targetRows.value.map(item => item.master_id) : []
}

function handleRun(id: string) {
  store.triggerProbation(id)
  selectedKeys.value = selectedKeys.value.filter(item => item !== id)
  message.success('已为该员工开启转正流程')
}

function handleHold(id: string) {
  store.holdProbation(id)
  selectedKeys.value = selectedKeys.value.filter(item => item !== id)
  message.warning('已将该员工流程挂起')
}

function batchTrigger(isStart: boolean) {
  selectedKeys.value.forEach(id => {
    if (isStart) store.triggerProbation(id)
    else store.holdProbation(id)
  })
  message[isStart ? 'success' : 'warning'](isStart ? '批量开启成功' : '批量挂起成功')
  selectedKeys.value = []
}
</script>
