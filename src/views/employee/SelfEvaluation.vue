<template>
  <div style="padding-bottom: 50px">
    <a-page-header title="试用期自评" @back="() => router.back()" />

    <a-alert
      v-if="record?.probation_status !== '05'"
      :message="record?.probation_status === '06' ? '提示：您的自评已提交，正在等待上级评价。' : '提示：当前不在自评阶段，仅供查阅。'"
      type="warning"
      show-icon
      class="compact-self-alert"
    />

    <!-- 逐目标自评 -->
    <a-card
      v-for="(goal, index) in record?.goals || []"
      :key="goal.goal_id"
      :title="`目标 ${index + 1}：${goal.content}`"
      style="margin-bottom: 16px"
    >
      <a-descriptions :column="1" size="small" bordered style="margin-bottom: 16px">
        <a-descriptions-item label="预期结果">{{ goal.measure }}</a-descriptions-item>
      </a-descriptions>

      <!-- 目标回顾（必填） -->
      <a-form-item
        label="目标回顾"
        required
        style="margin-bottom: 16px"
      >
        <a-textarea
          v-model:value="goalReviews[index]"
          :rows="3"
          placeholder="请回顾该项目标的完成情况，如实际产出、关键成果等..."
          :disabled="record?.probation_status !== '05'"
        />
      </a-form-item>

    </a-card>

    <!-- 总体评价 -->
    <a-card title="总体评价" style="margin-bottom: 16px">
      <a-form layout="vertical">
        <a-form-item label="请对试用期整体表现进行总结评价" required>
          <a-textarea
            v-model:value="overallEval"
            :rows="6"
            placeholder="请从工作产出、能力成长、团队协作等方面进行总体自评..."
            :disabled="record?.probation_status !== '05'"
          />
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 操作按钮 -->
    <div style="text-align: right" v-if="record?.probation_status === '05'">
      <a-space>
        <a-button @click="router.back()">取消</a-button>
        <a-button type="primary" @click="handleSubmit" :loading="saving">提交自评</a-button>
      </a-space>
    </div>

    <!-- 历史评价记录 -->
    <a-card v-if="historyEvals.length > 0" title="已提交的评价记录" style="margin-top: 16px">
      <a-list item-layout="vertical" :data-source="historyEvals">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta :description="item.create_time">
              <template #title>
                <a-tag :color="evalTypeColor(item.eval_type)">{{ evalTypeLabel(item.eval_type) }}</a-tag>
                {{ item.evaluator_name }}
              </template>
              <template #avatar><a-avatar><user-outlined /></a-avatar></template>
            </a-list-item-meta>
            <div style="white-space: pre-wrap; background: #fafafa; padding: 12px; border-radius: 4px;">{{ item.content }}</div>
          </a-list-item>
        </template>
      </a-list>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useProbationStore } from '@/store/probation';
import { message } from 'ant-design-vue';
import { UserOutlined } from '@ant-design/icons-vue';

const router = useRouter();
const store = useProbationStore();
const saving = ref(false);

const record = computed(() => store.records.find(r => r.emp_id === store.currentEmpId));

// 逐目标回顾内容
const goalReviews = ref<string[]>([]);
// 总体评价
const overallEval = ref('');

function initForm() {
  const goals = record.value?.goals || [];
  goalReviews.value = goals.map(() => '');
  overallEval.value = '';
}

onMounted(initForm);

watch(() => store.currentEmpId, () => {
  initForm();
});

const historyEvals = computed(() => (record.value?.evaluations || []).filter(e => e.eval_type !== 'manager'));

const evalTypeLabel = (type: string) => {
  const map: Record<string, string> = { 'self': '自评', 'manager': '上级评价', 'hrbp': 'HRBP评价', 'invited': '受邀评价' };
  return map[type] || type;
};
const evalTypeColor = (type: string) => {
  const map: Record<string, string> = { 'self': 'blue', 'manager': 'green', 'hrbp': 'purple', 'invited': 'cyan' };
  return map[type] || 'default';
};

const handleSubmit = () => {
  const goals = record.value?.goals || [];

  // 校验逐目标回顾
  for (let i = 0; i < goals.length; i++) {
    if (!goalReviews.value[i] || !goalReviews.value[i].trim()) {
      message.error(`请完成目标 ${i + 1} 的目标回顾`);
      return;
    }
  }

  // 校验总体评价
  if (!overallEval.value.trim()) {
    message.error('请填写总体评价');
    return;
  }

  // 组装自评内容
  const evalData = {
    goal_evaluations: goals.map((goal, i) => ({
      goal_id: goal.goal_id,
      dimension: goal.dimension,
      content: goal.content,
      goal_review: goalReviews.value[i]
    })),
    overall_eval: overallEval.value
  };

  saving.value = true;
  setTimeout(() => {
    store.submitSelfEval(record.value!.master_id, JSON.stringify(evalData), record.value!.emp_name);
    message.success('自评提交成功！已同时开启上级评价和HRBP评价流程。');
    saving.value = false;
    router.push('/employee/dashboard');
  }, 800);
};
</script>

<style scoped>
.compact-self-alert {
  margin-bottom: 16px;
}

.compact-self-alert :deep(.ant-alert-message) {
  font-size: 13px;
  line-height: 22px;
}

.compact-self-alert :deep(.ant-alert-content) {
  min-height: 22px;
}
</style>
