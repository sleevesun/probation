export type Phase = '目标设定' | '开启评估' | '试用期评估';

export interface EmailTemplate {
  id: string;
  phase: Phase;
  title: string;
  role: '员工' | '上级' | 'HRBP';
  /** 触发条件说明 */
  trigger: string;
  /** 接收人需执行的动作说明 */
  action: string;
  defaultVars: Record<string, string>;
  renderBody: (vars: Record<string, string>) => string;
}

// 获取当前环境的域名
const getBaseUrl = () => {
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
};
const baseUrl = getBaseUrl();

// 统一的官方邮件皮肤
export const renderEmailSkin = (bodyHtml: string, subject: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333333;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .email-header {
      background-color: #1890ff;
      padding: 24px 32px;
      color: #ffffff;
      text-align: left;
    }
    .email-header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
    .email-body {
      padding: 32px;
    }
    .email-body p {
      margin: 0 0 16px 0;
    }
    .email-button {
      display: inline-block;
      padding: 10px 24px;
      background-color: #1890ff;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 40px;
      font-weight: 500;
      margin-top: 16px;
      margin-bottom: 16px;
    }
    .email-footer {
      padding: 24px 32px;
      background-color: #fafafa;
      color: #999999;
      font-size: 12px;
      text-align: center;
      border-top: 1px solid #f0f0f0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>试用期管理系统</h1>
    </div>
    <div class="email-body">
      ${bodyHtml}
    </div>
    <div class="email-footer">
      <p>此邮件由系统自动发送，请勿直接回复。</p>
      <p>© 2025 公司人力资源部 保留所有权利</p>
    </div>
  </div>
</body>
</html>
`;

// =============================================================================
// 模板数据
//
// 说明：系统待办（Work Item）是流程主驱动，邮件 / WOA / OTP 仅作为触达渠道。
// 每条模板均标注 phase（阶段）、role（接收角色）、trigger（触发条件）、action（期望动作）。
// =============================================================================

export const emailTemplates: EmailTemplate[] = [
  // ============================================================
  // 阶段一：目标设定
  // ============================================================
  {
    id: '01_goal_remind_employee',
    phase: '目标设定',
    title: '【提醒】请提交试用期目标',
    role: '员工',
    trigger: '入职满 1 个月，员工尚未提交试用期目标',
    action: '登录系统，制定并提交试用期目标',
    defaultVars: {
      employee_name: '王明辉',
      hire_date: '2025-02-01',
      login_url: `${baseUrl}/auth/token?token=mock_token_emp&redirect=/employee/goals`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.employee_name}</strong>，</p>
      <p>您已入职满 1 个月（入职日期：${vars.hire_date}），请及时登录试用期管理系统制定并提交您的试用期目标。</p>
      <p>明确的目标有助于您更好地融入团队并在试用期内取得优异表现。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往提交试用期目标</a>
      </div>
    `
  },
  {
    id: '02_goal_confirm_manager',
    phase: '目标设定',
    title: '【待办】请确认员工试用期目标',
    role: '上级',
    trigger: '员工提交试用期目标后，系统实时生成待办',
    action: '登录系统，审核目标内容并确认或退回',
    defaultVars: {
      manager_name: '陈思远',
      employee_name: '王明辉',
      login_url: `${baseUrl}/auth/token?token=mock_token_mgr&redirect=/manager/dashboard`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.manager_name}</strong>，</p>
      <p>您的团队成员 <strong>${vars.employee_name}</strong> 已提交了试用期目标。</p>
      <p>请及时登录试用期管理系统，进行确认或退回操作。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往处理</a>
      </div>
    `
  },
  {
    id: '02b_goal_return_employee',
    phase: '目标设定',
    title: '【待办】请修改并重新提交试用期目标',
    role: '员工',
    trigger: '上级退回试用期目标后，系统实时生成待办并通知',
    action: '查看退回原因，修改目标后重新提交',
    defaultVars: {
      employee_name: '王明辉',
      manager_name: '陈思远',
      return_comment: '请补充更明确的阶段目标和可衡量结果，并区分核心工作与协作目标。',
      login_url: `${baseUrl}/auth/token?token=mock_token_emp&redirect=/employee/goals`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.employee_name}</strong>，</p>
      <p>您的试用期目标已被直属上级 <strong>${vars.manager_name}</strong> 退回，请根据反馈完成修改后重新提交。</p>
      <p><strong>退回原因：</strong>${vars.return_comment}</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往修改试用期目标</a>
      </div>
    `
  },
  {
    id: '03_goal_followup_hrbp_submitted',
    phase: '目标设定',
    title: '【提醒】请跟进上级确认目标进度',
    role: 'HRBP',
    trigger: '入职满 3 个月，员工已提交目标但上级尚未确认',
    action: '联系直属上级，提醒其尽快确认员工目标',
    defaultVars: {
      hrbp_name: '刘建国',
      employee_name: '王明辉',
      manager_name: '陈思远',
      login_url: `${baseUrl}/auth/token?token=mock_token_hr&redirect=/hrbp/panorama`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.hrbp_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 已入职满 3 个月，其试用期目标已提交但上级（${vars.manager_name}）尚未确认。</p>
      <p>请跟进上级确认进度，确保目标设定流程正常推进。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往查看</a>
      </div>
    `
  },
  {
    id: '04_goal_followup_manager_not_submitted',
    phase: '目标设定',
    title: '【提醒】请督促员工提交试用期目标',
    role: '上级',
    trigger: '入职满 3 个月，员工尚未提交试用期目标',
    action: '联系员工，督促其尽快提交试用期目标',
    defaultVars: {
      manager_name: '陈思远',
      employee_name: '王明辉',
      login_url: `${baseUrl}/auth/token?token=mock_token_mgr&redirect=/manager/dashboard`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.manager_name}</strong>，</p>
      <p>您的团队成员 <strong>${vars.employee_name}</strong> 已入职满 3 个月，但尚未提交试用期目标。</p>
      <p>请及时督促员工登录系统完成目标设定，以保障后续评估流程按时推进。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往查看</a>
      </div>
    `
  },
  {
    id: '05_goal_followup_hrbp_not_submitted',
    phase: '目标设定',
    title: '【提醒】请跟进员工目标提交情况',
    role: 'HRBP',
    trigger: '入职满 3 个月，员工尚未提交试用期目标',
    action: '联系员工和上级，跟进目标提交进度',
    defaultVars: {
      hrbp_name: '刘建国',
      employee_name: '王明辉',
      login_url: `${baseUrl}/auth/token?token=mock_token_hr&redirect=/hrbp/panorama`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.hrbp_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 已入职满 3 个月，但尚未提交试用期目标。</p>
      <p>请跟进员工及其上级，确保目标尽快完成设定。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往查看</a>
      </div>
    `
  },
  {
    id: '06_goal_late_submit_notify_manager',
    phase: '目标设定',
    title: '【通知】员工已提交试用期目标',
    role: '上级',
    trigger: '员工提交试用期目标后，系统实时通知',
    action: '登录系统，审核并确认员工目标',
    defaultVars: {
      manager_name: '陈思远',
      employee_name: '王明辉',
      login_url: `${baseUrl}/auth/token?token=mock_token_mgr&redirect=/manager/dashboard`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.manager_name}</strong>，</p>
      <p>您的团队成员 <strong>${vars.employee_name}</strong> 已提交试用期目标。</p>
      <p>请及时登录系统进行审核确认。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往处理</a>
      </div>
    `
  },
  {
    id: '07_goal_late_submit_notify_hrbp',
    phase: '目标设定',
    title: '【通知】员工已提交试用期目标',
    role: 'HRBP',
    trigger: '员工提交试用期目标后，系统实时通知',
    action: '知悉并跟进后续目标确认进度',
    defaultVars: {
      hrbp_name: '刘建国',
      employee_name: '王明辉',
      login_url: `${baseUrl}/auth/token?token=mock_token_hr&redirect=/hrbp/panorama`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.hrbp_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 已提交试用期目标。</p>
      <p>系统已同步通知其直属上级进行确认，请关注后续确认进度。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往查看</a>
      </div>
    `
  },

  // ============================================================
  // 阶段二：开启评估
  // ============================================================
  {
    id: '08_eval_trigger_hrbp',
    phase: '开启评估',
    title: '【待办】请开启试用期评估',
    role: 'HRBP',
    trigger: '入职满 4.5 个月，且试用期目标已确认',
    action: '登录系统，为该员工开启试用期评估流程',
    defaultVars: {
      hrbp_name: '刘建国',
      employee_name: '王明辉',
      hire_date: '2025-02-01',
      login_url: `${baseUrl}/auth/token?token=mock_token_hr&redirect=/hrbp/panorama`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.hrbp_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 入职已满 4.5 个月（入职日期：${vars.hire_date}），且试用期目标已确认。</p>
      <p>请及时登录试用期管理系统，开启其试用期评估流程。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往开启评估</a>
      </div>
    `
  },
  {
    id: '09_eval_start_employee',
    phase: '开启评估',
    title: '【待办】请完成试用期自评',
    role: '员工',
    trigger: 'HRBP 开启评估后，系统实时生成自评待办',
    action: '登录系统，完成试用期自评并提交',
    defaultVars: {
      employee_name: '王明辉',
      deadline_date: '2025-07-01',
      login_url: `${baseUrl}/auth/token?token=mock_token_emp&redirect=/employee/self-eval`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.employee_name}</strong>，</p>
      <p>您的试用期评估流程已开启。</p>
      <p>请及时登录试用期管理系统，进行试用期自评。为了不影响您的转正进度，请不要晚于 <strong>${vars.deadline_date}</strong> 提交。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往填写自评</a>
      </div>
    `
  },
  {
    id: '10_eval_notify_manager',
    phase: '开启评估',
    title: '【通知】试用期评估已开启',
    role: '上级',
    trigger: 'HRBP 开启评估后，系统实时通知上级（仅知晓，无待办）',
    action: '知悉评估已开启，待员工自评完成后将收到评价待办',
    defaultVars: {
      manager_name: '陈思远',
      employee_name: '王明辉',
      login_url: `${baseUrl}/auth/token?token=mock_token_mgr&redirect=/manager/dashboard`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.manager_name}</strong>，</p>
      <p>您的团队成员 <strong>${vars.employee_name}</strong> 的试用期评估流程已开启。</p>
      <p>员工正在进行自评，自评完成后您将收到评价待办通知。当前无需操作。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往查看</a>
      </div>
    `
  },

  // ============================================================
  // 阶段三：试用期评估
  // ============================================================
  {
    id: '11_eval_todo_manager',
    phase: '试用期评估',
    title: '【待办】请填写上级评价与转正建议',
    role: '上级',
    trigger: '员工完成自评提交后，系统实时生成上级评价待办',
    action: '登录系统，填写上级评价并给出转正建议',
    defaultVars: {
      manager_name: '陈思远',
      employee_name: '王明辉',
      login_url: `${baseUrl}/auth/token?token=mock_token_mgr&redirect=/manager/evaluation/M001`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.manager_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 已完成试用期自评。</p>
      <p>请及时登录试用期管理系统，填写上级评价并给出转正建议。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往评价</a>
      </div>
    `
  },
  {
    id: '12_eval_followup_hrbp',
    phase: '试用期评估',
    title: '【提醒】请跟进上级评价进度',
    role: 'HRBP',
    trigger: '员工自评完成后，系统通知 HRBP 跟进上级评价',
    action: '跟进直属上级完成评价，保障转正流程按时推进',
    defaultVars: {
      hrbp_name: '刘建国',
      employee_name: '王明辉',
      manager_name: '陈思远',
      login_url: `${baseUrl}/auth/token?token=mock_token_hr&redirect=/hrbp/panorama`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.hrbp_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 已完成试用期自评，现等待上级（${vars.manager_name}）填写评价。</p>
      <p>请跟进评价进度，确保转正流程按时推进。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往查看</a>
      </div>
    `
  },
  {
    id: '13_eval_remind_manager_overdue',
    phase: '试用期评估',
    title: '【提醒】试用期评估即将逾期',
    role: '上级',
    trigger: '入职满 5.5 个月，上级评价尚未完成',
    action: '尽快登录系统完成上级评价，避免影响转正进度',
    defaultVars: {
      manager_name: '陈思远',
      employee_name: '王明辉',
      hire_date: '2025-02-01',
      login_url: `${baseUrl}/auth/token?token=mock_token_mgr&redirect=/manager/evaluation/M001`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.manager_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 已入职满 5.5 个月（入职日期：${vars.hire_date}），试用期评估流程尚未完成。</p>
      <p>请尽快登录系统完成上级评价，避免影响员工转正进度。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往评价</a>
      </div>
    `
  },
  {
    id: '14_eval_remind_hrbp_overdue',
    phase: '试用期评估',
    title: '【提醒】试用期评估流程即将逾期',
    role: 'HRBP',
    trigger: '入职满 5.5 个月，自评或上级评价或审批仍未完成',
    action: '排查未完成环节，推动相关角色尽快完成',
    defaultVars: {
      hrbp_name: '刘建国',
      employee_name: '王明辉',
      hire_date: '2025-02-01',
      login_url: `${baseUrl}/auth/token?token=mock_token_hr&redirect=/hrbp/panorama`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.hrbp_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 已入职满 5.5 个月（入职日期：${vars.hire_date}），试用期评估流程仍有未完成环节。</p>
      <p>请排查自评、上级评价或审批进度，推动相关角色尽快完成。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往处理</a>
      </div>
    `
  }
];

/** 按阶段分组，供页面侧边栏使用 */
export const phaseGroups: { phase: Phase; description: string }[] = [
  { phase: '目标设定', description: '员工提交目标 → 上级确认 → HRBP 跟进' },
  { phase: '开启评估', description: 'HRBP 开启评估 → 员工自评 → 上级知晓' },
  { phase: '试用期评估', description: '上级评价 → HRBP 跟进 → 逾期提醒' }
];
