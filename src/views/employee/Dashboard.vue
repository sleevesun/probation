<template>
  <div>
    <PrdAnnotation id="1">
      <a-page-header title="我的试用期" :sub-title="`已入职 ${daysSinceHire} 天`">
        <template #tags>
          <a-tag :color="statusTagColor">{{ currentStatusText }}</a-tag>
        </template>
      </a-page-header>

      <a-card style="margin-top: 16px">
        <a-steps :current="currentStep" size="small" :status="stepStatus">
          <a-step title="提交目标" />
          <a-step title="上级确认" />
          <a-step title="试用期评价" />
          <a-step title="完成" />
        </a-steps>
      </a-card>
    </PrdAnnotation>

    <!-- 员工信息 -->
    <PrdAnnotation id="3">
      <a-card title="我的信息" :bordered="false" style="margin-top: 24px">
        <a-descriptions :column="3">
           <a-descriptions-item label="姓名">{{ record?.emp_name }}</a-descriptions-item>
           <a-descriptions-item label="工号">{{ record?.emp_id }}</a-descriptions-item>
           <a-descriptions-item label="岗位">{{ record?.position }}</a-descriptions-item>
           <a-descriptions-item label="部门">{{ record?.parent_dept }}\{{ record?.dept_name }}</a-descriptions-item>
           <a-descriptions-item label="直属上级">{{ record?.manager_name }}</a-descriptions-item>
           <a-descriptions-item label="入职日期">{{ record?.hire_date }}</a-descriptions-item>
        </a-descriptions>
      </a-card>
    </PrdAnnotation>

    <!-- 当前进展 -->
    <PrdAnnotation id="2">
      <a-card title="当前进展" :bordered="false" style="margin-top: 16px">
          <template #extra>
            <a-space v-if="todoList.length > 1">
              <a-button type="text" size="small" :disabled="currentTodoIndex === 0" @click="prevTodo">
                <template #icon><left-outlined /></template>
              </a-button>
              <span>{{ currentTodoIndex + 1 }} / {{ todoList.length }}</span>
              <a-button type="text" size="small" :disabled="currentTodoIndex === todoList.length - 1" @click="nextTodo">
                <template #icon><right-outlined /></template>
              </a-button>
            </a-space>
          </template>

          <a-list item-layout="horizontal" v-if="currentTodo">
            <a-list-item v-if="currentTodo.type === 'alert'">
              <a-alert type="warning" show-icon style="width: 100%">
                <template #message>{{ currentTodo.title }}</template>
                <template #description>{{ currentTodo.desc }}</template>
              </a-alert>
            </a-list-item>

            <a-list-item v-else>
              <a-list-item-meta :description="currentTodo.desc">
                <template #title>
                  <a v-if="currentTodo.path" href="javascript:;" @click="handleTodoAction(currentTodo)">
                    {{ currentTodo.title }}
                  </a>
                  <span v-else :style="{ color: currentTodo.type === 'result' ? currentTodo.color : 'inherit' }">
                    {{ currentTodo.title }}
                  </span>
                </template>
                <template #avatar>
                  <a-avatar :style="{ backgroundColor: currentTodo.color }">
                    <exception-outlined v-if="currentTodo.icon === 'exception'" />
                    <form-outlined v-else-if="currentTodo.icon === 'form'" />
                    <clock-circle-outlined v-else-if="currentTodo.icon === 'clock'" />
                    <loading-outlined v-else-if="currentTodo.icon === 'loading'" />
                    <check-outlined v-else-if="currentTodo.icon === 'check'" />
                  </a-avatar>
                </template>
              </a-list-item-meta>
              <template #actions v-if="currentTodo.path">
                <a-button type="primary" size="small" @click="handleTodoAction(currentTodo)">去填写</a-button>
              </template>
            </a-list-item>
          </a-list>

        </a-card>
    </PrdAnnotation>

    <!-- 快捷操作按钮 -->
    <PrdAnnotation id="5">
      <a-card title="快捷操作" :bordered="false" style="margin-top: 16px">
        <a-space>
          <a-button
            v-if="showGoalBtn"
            type="primary"
            @click="openGoalModal"
          >
            试用期目标
          </a-button>
          <a-button
            v-if="showSelfEvalBtn"
            type="primary"
            @click="openSelfEvalModal"
          >
            试用期自评
          </a-button>
        </a-space>
        <a-empty v-if="!showGoalBtn && !showSelfEvalBtn" description="暂无可执行操作" />
      </a-card>
    </PrdAnnotation>

    <!-- 反馈记录 -->
    <PrdAnnotation id="4">
      <a-card title="反馈记录" :bordered="false" style="margin-top: 16px">
        <!-- 结果已发布且转正通过时，展示直属上级最终评价 -->
        <div v-if="showFinalManagerEval" style="margin-bottom: 16px">
          <a-alert
            type="success"
            show-icon
            style="margin-bottom: 12px"
          >
            <template #message>
              <span style="font-weight: 600">直属上级最终评价</span>
              <a-tag color="green" style="margin-left: 8px">最终评价</a-tag>
            </template>
            <template #description>
              <div style="margin-top: 8px">
                <div style="color: #666; font-size: 13px; margin-bottom: 4px">
                  <span>{{ finalManagerEval?.evaluator_name }}</span>
                  <span style="margin-left: 16px">{{ finalManagerEval?.create_time }}</span>
                </div>
                <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6">{{ finalManagerEval?.content }}</div>
              </div>
            </template>
          </a-alert>
        </div>

        <!-- 阶段性反馈记录 -->
        <div v-if="managerStageEvaluations.length > 0">
          <div v-if="showFinalManagerEval" style="color: #999; font-size: 13px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0">
            阶段性反馈
          </div>
          <a-table :dataSource="managerStageEvaluations" :columns="stageEvalColumns" :pagination="false" rowKey="stage_eval_id" size="small" bordered />
        </div>

        <!-- 空状态 -->
        <a-empty v-if="!showFinalManagerEval && managerStageEvaluations.length === 0" description="暂无反馈记录" />
      </a-card>
    </PrdAnnotation>

    <!-- 试用期目标弹窗 -->
    <a-modal
      v-model:open="goalModalVisible"
      title="试用期目标"
      :footer="isGoalEditable ? undefined : null"
      width="80vw"
      :bodyStyle="{ maxHeight: '70vh', overflowY: 'auto' }"
      @cancel="goalModalVisible = false"
    >
      <a-alert
        v-if="isGoalEditable && record?.return_comment"
        :message="`目标被退回，请修改后重新提交。退回意见：${record.return_comment}`"
        type="warning"
        show-icon
        banner
        style="margin-bottom: 16px"
      />
      <a-alert
        v-if="!isGoalEditable"
        message="目标已锁定"
        :description="null"
        type="info"
        show-icon
        banner
        style="margin-bottom: 16px"
      />
      <a-table
        :dataSource="goalModalData"
        :columns="goalColumns"
        :pagination="false"
        rowKey="goal_id"
        bordered
        size="small"
      >
        <template #bodyCell="{ column, record: row, index }">
          <template v-if="column.dataIndex === 'seq'">{{ index + 1 }}</template>
          <template v-if="column.dataIndex === 'content'">
            <a-textarea v-if="isGoalEditable" v-model:value="row.content" :rows="2" placeholder="请输入具体目标内容" />
            <span v-else>{{ row.content }}</span>
          </template>
          <template v-if="column.dataIndex === 'measure'">
            <a-textarea v-if="isGoalEditable" v-model:value="row.measure" :rows="2" placeholder="请输入预期结果" />
            <span v-else>{{ row.measure }}</span>
          </template>
          <template v-if="column.dataIndex === 'weight'">
            <a-input-number v-if="isGoalEditable" v-model:value="row.weight" :min="1" :max="100" placeholder="%" style="width: 80px" addonAfter="%" />
            <span v-else>{{ row.weight != null ? row.weight + '%' : '-' }}</span>
          </template>
          <template v-if="column.key === 'action' && isGoalEditable">
            <a-button type="link" danger @click="removeGoal(index)">删除</a-button>
          </template>
        </template>
      </a-table>
      <a-button
        v-if="isGoalEditable"
        type="dashed"
        @click="addGoal"
        style="width: 200px; margin-top: 12px"
        :disabled="goalModalData.length >= 5"
      >
        + 添加目标 (上限 5 条)
      </a-button>
      <template #footer v-if="isGoalEditable">
        <a-space>
          <a-button @click="handleGoalSave" :loading="goalSaving">保存草稿</a-button>
          <a-button type="primary" @click="handleGoalSubmit" :loading="goalSaving">提交确认</a-button>
        </a-space>
      </template>
    </a-modal>

    <!-- 试用期自评弹窗 -->
    <a-modal
      v-model:open="selfEvalModalVisible"
      title="试用期自评"
      :footer="isSelfEvalEditable ? undefined : null"
      width="80vw"
      :bodyStyle="{ maxHeight: '70vh', overflowY: 'auto' }"
      @cancel="selfEvalModalVisible = false"
    >
      <a-alert
        v-if="!isSelfEvalEditable"
        message="提示"
        :description="null"
        type="warning"
        show-icon
        banner
        style="margin-bottom: 16px"
      />

      <!-- 逐目标自评 -->
      <a-card
        v-for="(goal, index) in record?.goals || []"
        :key="goal.goal_id"
        :title="`目标 ${index + 1}：${goal.content}`"
        style="margin-bottom: 16px"
        size="small"
      >
        <a-descriptions :column="1" size="small" bordered style="margin-bottom: 12px">
          <a-descriptions-item label="预期结果">{{ goal.measure }}</a-descriptions-item>
        </a-descriptions>
        <a-form-item label="目标回顾" required style="margin-bottom: 0">
          <a-textarea
            v-model:value="selfEvalGoalReviews[index]"
            :rows="3"
            placeholder="请回顾该项目标的完成情况，如实际产出、关键成果等..."
            :disabled="!isSelfEvalEditable"
          />
        </a-form-item>
      </a-card>

      <!-- 总体评价 -->
      <a-card title="总体评价" style="margin-bottom: 16px" size="small">
        <a-form layout="vertical">
          <a-form-item label="请对试用期整体表现进行总结评价" required style="margin-bottom: 0">
            <a-textarea
              v-model:value="selfEvalOverall"
              :rows="5"
              placeholder="请从工作产出、能力成长、团队协作等方面进行总体自评..."
              :disabled="!isSelfEvalEditable"
            />
          </a-form-item>
        </a-form>
      </a-card>

      <!-- 历史评价记录 -->
      <a-card v-if="historySelfEvals.length > 0" title="已提交的评价记录" style="margin-top: 16px" size="small">
        <a-list item-layout="vertical" :data-source="historySelfEvals" size="small">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta :description="item.create_time">
                <template #title>
                  <a-tag :color="evalTypeColor(item.eval_type)">{{ evalTypeLabel(item.eval_type) }}</a-tag>
                  {{ item.evaluator_name }}
                </template>
                <template #avatar><a-avatar size="small"><user-outlined /></a-avatar></template>
              </a-list-item-meta>
              <div style="white-space: pre-wrap; background: #fafafa; padding: 8px; border-radius: 4px; font-size: 13px">{{ item.content }}</div>
            </a-list-item>
          </template>
        </a-list>
      </a-card>

      <template #footer v-if="isSelfEvalEditable">
        <a-space>
          <a-button @click="selfEvalModalVisible = false">取消</a-button>
          <a-button type="primary" @click="handleSelfEvalSubmit" :loading="selfEvalSaving">提交自评</a-button>
        </a-space>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, h } from 'vue';
import { useRouter } from 'vue-router';
import { useProbationStore, STATUS_COLOR, getDetailedStatusText, isFailedDecision, GoalItem } from '@/store/probation';
import { ExceptionOutlined, FormOutlined, ClockCircleOutlined, LoadingOutlined, CheckOutlined, LeftOutlined, RightOutlined, UserOutlined } from '@ant-design/icons-vue';
import { message, Modal } from 'ant-design-vue';
import PrdAnnotation from '@/components/prd/PrdAnnotation.vue';

const router = useRouter();
const store = useProbationStore();

const record = computed(() => store.records.find(r => r.emp_id === store.currentEmpId));
const currentStatusText = computed(() => record.value ? getDetailedStatusText(record.value) : '');

// 终止转正的员工显示红色，其余按状态码映射颜色
const statusTagColor = computed(() => {
  if (!record.value) return 'default';
  if (record.value.terminated) return 'error';
  // 结果已发布但不通过时也显示红色
  if (record.value.probation_status === '10' && isFailedDecision(record.value.final_decision)) return 'error';
  return STATUS_COLOR[record.value.probation_status] || 'default';
});

const stageEvalColumns = [
  { title: '填写人', dataIndex: 'evaluator_name', width: 80 },
  { title: '角色', dataIndex: 'evaluator_role', width: 80 },
  { title: '评价内容', dataIndex: 'content' },
  { title: '时间', dataIndex: 'create_time', width: 150 }
];

const managerStageEvaluations = computed(() =>
  (record.value?.stage_evaluations || []).filter(item => item.evaluator_role === '直属上级')
);

// 判断是否展示直属上级最终评价：结果已发布（状态10）且转正通过
const showFinalManagerEval = computed(() => {
  if (!record.value) return false;
  return record.value.probation_status === '10' && !isFailedDecision(record.value.final_decision);
});

// 获取直属上级最终评价内容
const finalManagerEval = computed(() => {
  if (!record.value?.evaluations) return null;
  return record.value.evaluations.find(e => e.eval_type === 'manager');
});

const daysSinceHire = computed(() => {
  if (!record.value) return 0;
  const now = new Date(); const hire = new Date(record.value.hire_date);
  return Math.floor((now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24));
});

// --- 待办事项逻辑重构 ---
const currentTodoIndex = ref(0);

const todoList = computed(() => {
  const status = record.value?.probation_status;
  const items: any[] = [];

  switch (status) {
    case '01': {
      const isReturned = !!record.value?.return_comment;
      items.push({
        id: '01',
        type: 'action',
        title: isReturned ? '目标被退回，请修改后重新提交' : '【待办】填写试用期目标',
        desc: isReturned
          ? `退回意见：${record.value.return_comment}\n请根据上级意见调整目标内容，修改完成后重新提交。`
          : '请与上级沟通后完成试用期目标设定，并提交上级确认。',
        icon: 'exception',
        color: '#f56a00',
        path: '/employee/goals'
      });
      break;
    }
    case '02':
      items.push({
        id: '02',
        type: 'info',
        title: '【进行中】等待上级确认目标',
        desc: '您的试用期目标已提交，正在等待上级确认。',
        icon: 'clock',
        color: '#1890ff'
      });
      break;
    case '03':
    case '04':
      items.push({
        id: '03',
        type: 'info',
        title: '【进行中】目标已确认',
        desc: '目标已确认，等待试用期评估开启。',
        icon: 'check',
        color: '#52c41a'
      });
      break;
    case '05':
      items.push({
        id: '05',
        type: 'action',
        title: '【待办】填写试用期评价',
        desc: '转正流程已开启，请尽快完成转正自评。',
        icon: 'form',
        color: '#87d068',
        path: '/employee/self-eval'
      });
      break;
    case '06':
    case '07':
    case '08':
    case '09':
      items.push({
        id: 'eval',
        type: 'info',
        title: '【进行中】试用期评估中',
        desc: '您的试用期评估正在进行中，请耐心等待结果。',
        icon: 'loading',
        color: '#722ed1'
      });
      break;
    case '10': {
      const isPassed = record.value?.final_decision !== '不符合转正条件';
      items.push({
        id: '10',
        type: 'result',
        title: isPassed ? '【结果】恭喜您通过转正！' : '【结果】未通过转正',
        desc: isPassed ? '恭喜您通过试用期转正，祝您工作顺利！' : '很遗憾，您未通过试用期转正。',
        icon: isPassed ? 'check' : 'exception',
        color: isPassed ? '#52c41a' : '#f5222d'
      });
      break;
    }
    default:
      break;
  }

  return items;
});

const currentTodo = computed(() => {
  return todoList.value[currentTodoIndex.value] || null;
});

const prevTodo = () => {
  if (currentTodoIndex.value > 0) {
    currentTodoIndex.value--;
  }
};

const nextTodo = () => {
  if (currentTodoIndex.value < todoList.value.length - 1) {
    currentTodoIndex.value++;
  }
};

// 处理待办事项的点击动作，统一使用弹窗而非路由跳转
function handleTodoAction(todo: any) {
  if (todo.path === '/employee/goals') {
    openGoalModal();
  } else if (todo.path === '/employee/self-eval') {
    openSelfEvalModal();
  } else if (todo.path) {
    router.push(todo.path);
  }
}
// ------------------------

// 进度条: 提交目标(0) -> 上级确认(1) -> 试用期自评(2) -> 完成(3)
const currentStep = computed(() => {
  const s = record.value?.probation_status;
  switch (s) {
    case '01': return 0;
    case '02': return 1;
    case '03': case '04': return 1;
    case '05': return 2;
    case '06': case '07': case '08': case '09': return 2;
    case '10': return 3;
    default: return 0;
  }
});

const stepStatus = computed(() => {
  if (record.value?.probation_status === '10' && record.value.final_decision === '不符合转正条件') return 'error';
  if (record.value?.probation_status === '10') return 'finish';
  return 'process';
});

// ========== 试用期目标弹窗 ==========
const goalModalVisible = ref(false);
const goalModalData = ref<GoalItem[]>([]);
const goalSaving = ref(false);

// 01 可编辑，03+ 只读
const isGoalEditable = computed(() => {
  return record.value?.probation_status === '01';
});

const showGoalBtn = computed(() => {
  const s = record.value?.probation_status;
  return !!s && parseInt(s, 10) >= 1 && parseInt(s, 10) <= 10 && s !== '88' && s !== '99';
});

const goalColumns = computed(() => {
  const cols: any[] = [
    { title: '序号', dataIndex: 'seq', width: 60 },
    { title: h('span', ['目标内容', isGoalEditable.value ? h('span', { style: { color: '#ff4d4f', marginLeft: '4px' } }, '*') : null]), dataIndex: 'content' },
    { title: h('span', ['预期结果', isGoalEditable.value ? h('span', { style: { color: '#ff4d4f', marginLeft: '4px' } }, '*') : null]), dataIndex: 'measure' },
    { title: '权重', dataIndex: 'weight', width: 110 }
  ];
  if (isGoalEditable.value) {
    cols.push({ title: '操作', key: 'action', width: 80 });
  }
  return cols;
});

function openGoalModal() {
  goalModalData.value = JSON.parse(JSON.stringify(record.value?.goals || []));
  if (isGoalEditable.value && goalModalData.value.length === 0) {
    goalModalData.value.push({
      goal_id: 'G' + Date.now(),
      dimension: '业绩',
      content: '',
      measure: '',
      weight: undefined
    });
  }
  goalModalVisible.value = true;
}

function addGoal() {
  if (goalModalData.value.length < 5) {
    goalModalData.value.push({
      goal_id: 'G' + Date.now(),
      dimension: '业绩',
      content: '',
      measure: '',
      weight: undefined
    });
  }
}

function removeGoal(index: number) {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这条目标吗？删除后不可恢复。',
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      goalModalData.value.splice(index, 1);
    }
  });
}

function handleGoalSave() {
  goalSaving.value = true;
  setTimeout(() => {
    store.saveGoals(record.value!.master_id, goalModalData.value, false);
    message.success('草稿保存成功');
    goalSaving.value = false;
  }, 500);
}

function handleGoalSubmit() {
  const hasEmptyContent = goalModalData.value.some(g => !g.content || g.content.trim() === '');
  if (hasEmptyContent) {
    message.error('请填写完整所有的目标内容');
    return;
  }
  const hasEmptyMeasure = goalModalData.value.some(g => !g.measure || g.measure.trim() === '');
  if (hasEmptyMeasure) {
    message.error('请填写完整所有的预期结果');
    return;
  }
  const goalsWithWeight = goalModalData.value.filter(g => g.weight != null && g.weight > 0);
  if (goalsWithWeight.length > 0) {
    if (goalsWithWeight.length !== goalModalData.value.length) {
      message.error('若填写权重，请为所有目标均填写权重');
      return;
    }
    const totalWeight = goalModalData.value.reduce((sum, g) => sum + (g.weight || 0), 0);
    if (totalWeight !== 100) {
      message.error(`权重合计必须为 100%，当前合计 ${totalWeight}%`);
      return;
    }
  }
  goalSaving.value = true;
  setTimeout(() => {
    store.saveGoals(record.value!.master_id, goalModalData.value, true);
    message.success('目标提交成功，等待上级确认');
    goalSaving.value = false;
    goalModalVisible.value = false;
  }, 800);
}

// ========== 试用期自评弹窗 ==========
const selfEvalModalVisible = ref(false);
const selfEvalGoalReviews = ref<string[]>([]);
const selfEvalOverall = ref('');
const selfEvalSaving = ref(false);

// HRBP 开启评价后（05 待员工自评及后续流程），员工可看到自评按钮
const showSelfEvalBtn = computed(() => {
  const s = record.value?.probation_status;
  return !!s && parseInt(s, 10) >= 5 && parseInt(s, 10) <= 10;
});

const isSelfEvalEditable = computed(() => {
  return record.value?.probation_status === '05';
});

const historySelfEvals = computed(() =>
  (record.value?.evaluations || []).filter(e => e.eval_type !== 'manager')
);

const evalTypeLabel = (type: string) => {
  const map: Record<string, string> = { 'self': '自评', 'manager': '上级评价', 'hrbp': 'HRBP评价', 'invited': '受邀评价' };
  return map[type] || type;
};
const evalTypeColor = (type: string) => {
  const map: Record<string, string> = { 'self': 'blue', 'manager': 'green', 'hrbp': 'purple', 'invited': 'cyan' };
  return map[type] || 'default';
};

function openSelfEvalModal() {
  const goals = record.value?.goals || [];
  selfEvalGoalReviews.value = goals.map(() => '');
  selfEvalOverall.value = '';
  selfEvalModalVisible.value = true;
}

function handleSelfEvalSubmit() {
  const goals = record.value?.goals || [];
  for (let i = 0; i < goals.length; i++) {
    if (!selfEvalGoalReviews.value[i] || !selfEvalGoalReviews.value[i].trim()) {
      message.error(`请完成目标 ${i + 1} 的目标回顾`);
      return;
    }
  }
  if (!selfEvalOverall.value.trim()) {
    message.error('请填写总体评价');
    return;
  }
  const evalData = {
    goal_evaluations: goals.map((goal, i) => ({
      goal_id: goal.goal_id,
      dimension: goal.dimension,
      content: goal.content,
      goal_review: selfEvalGoalReviews.value[i]
    })),
    overall_eval: selfEvalOverall.value
  };
  selfEvalSaving.value = true;
  setTimeout(() => {
    store.submitSelfEval(record.value!.master_id, JSON.stringify(evalData), record.value!.emp_name);
    message.success('自评提交成功！');
    selfEvalSaving.value = false;
    selfEvalModalVisible.value = false;
  }, 800);
}
</script>
