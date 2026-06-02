<template>
  <div class="employee-switcher">
    <span class="employee-switcher__label">切换演示员工：</span>
    <a-select
      :value="store.currentEmpId"
      style="width: 280px"
      @change="handleChange"
      placeholder="请选择员工"
    >
      <a-select-option
        v-for="emp in employeeOptions"
        :key="emp.emp_id"
        :value="emp.emp_id"
      >
        {{ emp.emp_name }}（{{ emp.statusLabel }}）
      </a-select-option>
    </a-select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProbationStore, STATUS_MAP } from '@/store/probation'

const store = useProbationStore()

const employeeOptions = computed(() => {
  return store.records.map(r => ({
    emp_id: r.emp_id,
    emp_name: r.emp_name,
    statusLabel: r.return_comment && r.probation_status === '01'
      ? '目标被退回'
      : (STATUS_MAP[r.probation_status] || r.probation_status)
  }))
})

function handleChange(empId: string) {
  store.setCurrentEmpId(empId)
}
</script>

<style scoped>
.employee-switcher {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  margin-bottom: 16px;
}
.employee-switcher__label {
  font-weight: 600;
  margin-right: 8px;
  white-space: nowrap;
  color: #434343;
}
</style>
