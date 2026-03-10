<template>
  <div>
    <a-page-header title="试用期目标设定" @back="() => router.back()" />

    <a-alert
      v-if="record?.probation_status === '03' || parseInt(record?.probation_status || '0', 10) >= 4"
      message="目标已锁定"
      description="您的试用期目标已被确认或流程已往后流转，目前只能查阅不可修改。"
      type="info"
      show-icon
      style="margin-bottom: 16px"
    />

    <a-card>
      <a-form :model="formState" layout="vertical">
        <a-table 
          :dataSource="formState.goals" 
          :columns="columns" 
          :pagination="false"
          rowKey="goal_id"
          bordered
        >
          <template #bodyCell="{ column, record: row, index }">
             <template v-if="column.dataIndex === 'dimension'">
                <a-select v-model:value="row.dimension" style="width: 100%" :disabled="isLock">
                  <a-select-option value="业绩">业绩</a-select-option>
                  <a-select-option value="能力">能力</a-select-option>
                  <a-select-option value="融入">融入</a-select-option>
                </a-select>
             </template>
             <template v-if="column.dataIndex === 'content'">
                <a-textarea v-model:value="row.content" :rows="2" :disabled="isLock" placeholder="请输入具体目标内容及衡量标准" />
             </template>
             <template v-if="column.dataIndex === 'weight'">
                <a-input-number 
                  v-model:value="row.weight" 
                  :min="1" :max="100" 
                  :formatter="(value: number) => `${value}%`"
                  :parser="(value: string) => value.replace('%', '')"
                  :disabled="isLock"
                />
             </template>
             <template v-if="column.key === 'action'">
                <a-button type="link" danger @click="removeGoal(index)" :disabled="isLock">删除</a-button>
             </template>
          </template>
        </a-table>

        <div style="margin-top: 16px; display: flex; justify-content: space-between">
          <a-button type="dashed" @click="addGoal" style="width: 200px" :disabled="formState.goals.length >= 5 || isLock">
            + 添加目标 (上限 5 条)
          </a-button>

          <div style="font-size: 16px; font-weight: bold">
            权重合计: <span :style="{ color: totalWeight === 100 ? '#52c41a' : '#f5222d' }">{{ totalWeight }}%</span>
          </div>
        </div>

        <a-divider />

        <div style="text-align: right" v-if="!isLock">
          <a-space>
            <a-button @click="handleSave" :loading="saving">保存草稿</a-button>
            <a-button type="primary" @click="handleSubmit" :loading="saving" :disabled="totalWeight !== 100">提交确认</a-button>
          </a-space>
        </div>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProbationStore, GoalItem } from '@/store/probation';
import { message } from 'ant-design-vue';

const router = useRouter();
const store = useProbationStore();
const saving = ref(false);

const record = computed(() => store.records.find(r => r.emp_id === store.currentEmpId));

// Status rules check if locked. 01 = edit, 02 = edit/wait, >03 = lock
const isLock = computed(() => {
  const status = record.value?.probation_status || '01';
  return parseInt(status, 10) >= 3; 
});

const formState = reactive({
  goals: [] as GoalItem[]
});

onMounted(() => {
  if (record.value && record.value.goals) {
    // deep clone to avoid modifying store directly before save
    formState.goals = JSON.parse(JSON.stringify(record.value.goals));
  }
  if (formState.goals.length === 0 && !isLock.value) {
    addGoal();
  }
});

const columns = [
  { title: '考核维度', dataIndex: 'dimension', width: 150 },
  { title: '目标内容与衡量标准', dataIndex: 'content' },
  { title: '权重', dataIndex: 'weight', width: 120 },
  { title: '操作', key: 'action', width: 100 }
];

const totalWeight = computed(() => {
  return formState.goals.reduce((sum, item) => sum + (item.weight || 0), 0);
});

const addGoal = () => {
  if (formState.goals.length < 5) {
    formState.goals.push({
      goal_id: 'G' + Date.now(),
      dimension: '业绩',
      content: '',
      weight: 20
    });
  }
};

const removeGoal = (index: number) => {
  formState.goals.splice(index, 1);
};

const handleSave = () => {
  saving.value = true;
  setTimeout(() => {
    store.saveGoals(record.value!.master_id, formState.goals, false);
    message.success('草稿保存成功');
    saving.value = false;
  }, 500);
};

const handleSubmit = () => {
  if (totalWeight.value !== 100) {
    message.error('权重合计必须为 100%');
    return;
  }
  const hasEmptyContent = formState.goals.some(g => !g.content || g.content.trim() === '');
  if (hasEmptyContent) {
    message.error('请填写完整所有的目标内容');
    return;
  }

  saving.value = true;
  setTimeout(() => {
    store.saveGoals(record.value!.master_id, formState.goals, true);
    message.success('目标提交成功，等待上级确认');
    saving.value = false;
    router.push('/employee/dashboard');
  }, 800);
};
</script>
