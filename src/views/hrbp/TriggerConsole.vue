<template>
  <div>
    <a-page-header title="转正触发控制台" sub-title="入职满 4.5 个月到达关键节点的人员" />

    <a-card style="margin-top: 16px">
      <div style="margin-bottom: 16px">
        <a-space>
          <a-button type="primary" :disabled="!hasSelected" @click="batchTrigger(true)">
            批量开启转正
          </a-button>
          <a-button danger :disabled="!hasSelected" @click="batchTrigger(false)">
            批量挂起暂不开启
          </a-button>
        </a-space>
        <span style="margin-left: 8px">
          <template v-if="hasSelected">
            {{ `选中 ${selectedRowKeys.length} 项` }}
          </template>
        </span>
      </div>

      <a-table 
        :row-selection="{ selectedRowKeys: selectedRowKeys, onChange: onSelectChange }" 
        :dataSource="targetData" 
        :columns="columns" 
        rowKey="master_id" 
        bordered
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'dept_display'">
            {{ record.parent_dept }}\{{ record.dept_name }}
          </template>
          <template v-if="column.dataIndex === 'tenure'">
            {{ getMonthsSinceHire(record.hire_date) }} 个月
          </template>
          <template v-if="column.key === 'action'">
             <a-space>
                <a-button type="primary" size="small" @click="handleRun(record.master_id)">开启转正流程</a-button>
                <a-button type="dashed" danger size="small" @click="handleHold(record.master_id)">暂不开启(挂起)</a-button>
             </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useProbationStore, getMonthsSinceHire } from '@/store/probation';
import { message } from 'ant-design-vue';

const store = useProbationStore();
const selectedRowKeys = ref<string[]>([]);
const hasSelected = computed(() => selectedRowKeys.value.length > 0);

const targetData = computed(() => store.records.filter(r => r.probation_status === '04'));

const columns = [
  { title: '姓名', dataIndex: 'emp_name' },
  { title: '工号', dataIndex: 'emp_id', width: 80 },
  { title: '岗位', dataIndex: 'position', width: 130 },
  { title: '直属部门', dataIndex: 'dept_display', width: 160 },
  { title: '入职日期', dataIndex: 'hire_date' },
  { title: '入职时长', dataIndex: 'tenure', width: 100 },
  { title: '目标状态', customRender: () => '已锁定' },
  { title: '到期节点', customRender: () => '4.5个月' },
  { title: '操作', key: 'action', width: 250 }
];

const onSelectChange = (keys: string[]) => { selectedRowKeys.value = keys; };

const handleRun = (id: string) => {
  store.triggerProbation(id);
  message.success('已为该员工开启转正自评流程');
};

const handleHold = (id: string) => {
  store.holdProbation(id);
  message.warning('已将该员工试用期流程挂起');
};

const batchTrigger = (isStart: boolean) => {
  selectedRowKeys.value.forEach(id => {
    if (isStart) store.triggerProbation(id);
    else store.holdProbation(id);
  });
  selectedRowKeys.value = [];
  message[isStart ? 'success' : 'warning'](isStart ? '批量开启成功' : '批量挂起成功');
};
</script>
