<template>
  <div>
    <PrdAnnotation id="5">
      <a-page-header title="试用期目标设定" @back="() => router.back()" />

      <a-alert
        v-if="isLock"
        message="目标已锁定：您的试用期目标已被确认或流程已往后流转，目前只能查阅不可修改。"
        type="info"
        show-icon
        :banner="true"
        style="margin-bottom: 16px"
      />
      <a-alert
        v-else
        message="请填写试用期内的目标"
        type="info"
        show-icon
        :banner="true"
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
               <template v-if="column.dataIndex === 'seq'">
                  {{ index + 1 }}
               </template>
               <template v-if="column.dataIndex === 'content'">
                  <a-textarea v-model:value="row.content" :rows="2" :disabled="isLock" placeholder="请输入具体目标内容及衡量标准" />
               </template>
               <template v-if="column.dataIndex === 'measure'">
                  <a-textarea v-model:value="row.measure" :rows="2" :disabled="isLock" placeholder="请输入预期结果" />
               </template>
               <template v-if="column.dataIndex === 'weight'">
                  <a-input-number v-model:value="row.weight" :min="1" :max="100" :disabled="isLock" placeholder="%" style="width: 80px" addonAfter="%" />
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

          <PrdAnnotation id="6">
            <div style="text-align: right" v-if="!isLock">
              <a-space>
                <a-button @click="handleSave" :loading="saving">保存草稿</a-button>
                <a-button type="primary" @click="handleSubmit" :loading="saving">提交确认</a-button>
              </a-space>
            </div>
          </PrdAnnotation>
        </a-form>
      </a-card>
    </PrdAnnotation>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch, h } from 'vue';
import { useRouter } from 'vue-router';
import { useProbationStore, GoalItem } from '@/store/probation';
import { message, Modal } from 'ant-design-vue';
import PrdAnnotation from '@/components/prd/PrdAnnotation.vue';

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
  { title: '序号', dataIndex: 'seq', width: 60 },
  { title: h('span', ['目标内容', h('span', { style: { color: '#ff4d4f', marginLeft: '4px' } }, '*')]), dataIndex: 'content' },
  { title: h('span', ['预期结果', h('span', { style: { color: '#ff4d4f', marginLeft: '4px' } }, '*')]), dataIndex: 'measure' },
  { title: '权重', dataIndex: 'weight', width: 110 },
  { title: '操作', key: 'action', width: 80 }
];

const addGoal = () => {
  if (formState.goals.length < 5) {
    formState.goals.push({
      goal_id: 'G' + Date.now(),
      dimension: '业绩',
      content: '',
      measure: '',
      weight: undefined
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
    message.error('请填写完整所有的预期结果');
    return;
  }

  // 权重校验：若任一目标填写权重，则全部目标均需填写，且合计 100%
  const goalsWithWeight = formState.goals.filter(g => g.weight != null && g.weight > 0);
  if (goalsWithWeight.length > 0) {
    if (goalsWithWeight.length !== formState.goals.length) {
      message.error('若填写权重，请为所有目标均填写权重');
      return;
    }
    const totalWeight = formState.goals.reduce((sum, g) => sum + (g.weight || 0), 0);
    if (totalWeight !== 100) {
      message.error(`权重合计必须为 100%，当前合计 ${totalWeight}%`);
      return;
    }
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
