<template>
  <div>
    <EmployeeSwitcher />
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
             <template v-if="column.dataIndex === 'measure'">
                <a-textarea v-model:value="row.measure" :rows="2" :disabled="isLock" placeholder="请输入衡量方式或预期结果" />
             </template>
             <template v-if="column.key === 'action'">
                <a-button type="link" danger @click="removeGoal(index)" :disabled="isLock">删除</a-button>
             </template>
          </template>
        </a-table>

        <div style="margin-top: 16px">
          <a-button type="dashed" @click="addGoal" style="width: 200px" :disabled="formState.goals.length >= 5 || isLock">
            + 添加目标 (上限 5 条)
          </a-button>
        </div>

        <a-divider />

        <div style="text-align: right" v-if="!isLock">
          <a-space>
            <a-button @click="handleSave" :loading="saving">保存草稿</a-button>
            <a-button type="primary" @click="handleSubmit" :loading="saving">提交确认</a-button>
          </a-space>
        </div>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useProbationStore, GoalItem } from '@/store/probation';
import { message, Modal } from 'ant-design-vue';
import EmployeeSwitcher from '@/components/EmployeeSwitcher.vue';

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

function initForm() {
  if (record.value && record.value.goals) {
    formState.goals = JSON.parse(JSON.stringify(record.value.goals));
  } else {
    formState.goals = [];
  }
  if (formState.goals.length === 0 && !isLock.value) {
    addGoal();
  }
}

onMounted(initForm);

watch(() => store.currentEmpId, () => {
  initForm();
});

const columns = [
  { title: '目标维度', dataIndex: 'dimension', width: 120 },
  { title: '目标内容', dataIndex: 'content' },
  { title: '衡量方式/预期结果', dataIndex: 'measure' },
  { title: '操作', key: 'action', width: 80 }
];

const addGoal = () => {
  if (formState.goals.length < 5) {
    formState.goals.push({
      goal_id: 'G' + Date.now(),
      dimension: '业绩',
      content: '',
      measure: ''
    });
  }
};

// [UI/UX 修复] 删除操作添加确认机制，防止误删
const removeGoal = (index: number) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这条目标吗？删除后不可恢复。',
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      formState.goals.splice(index, 1);
    }
  });
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
  const hasEmptyContent = formState.goals.some(g => !g.content || g.content.trim() === '');
  if (hasEmptyContent) {
    message.error('请填写完整所有的目标内容');
    return;
  }
  const hasEmptyMeasure = formState.goals.some(g => !g.measure || g.measure.trim() === '');
  if (hasEmptyMeasure) {
    message.error('请填写完整所有的衡量方式/预期结果');
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
