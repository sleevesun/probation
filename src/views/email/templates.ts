export type Phase = '目标设定' | '开启试用期评价' | '试用期评价' | '转正审批流程';

export interface EmailTemplate {
  id: string;
  phase: Phase;
  title: string;
  role: '员工' | '上级' | 'HRBP' | '审批人' | 'HRD' | 'HRBP head' | 'HRD, HRBP head';
  /** 触发条件说明 */
  trigger: string;
  /** 接收人需执行的动作说明 */
  action: string;
  /** 触达渠道 */
  channels: string[];
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
    trigger: '入职满 1 周，员工尚未提交试用期目标',
    action: '登录系统，制定并提交试用期目标',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      employee_name: '王明辉',
      hire_date: '2025-02-01',
      login_url: `${baseUrl}/auth/token?token=mock_token_emp&redirect=/employee/goals`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.employee_name}</strong>，</p>
      <p>您已入职满 1 周（入职日期：${vars.hire_date}），请及时登录试用期管理系统制定并提交您的试用期目标。</p>
      <p>明确的目标有助于您更好地融入团队并在试用期内取得优异表现。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往提交试用期目标</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '02_goal_confirm_manager',
    phase: '目标设定',
    title: '【待办】请确认员工试用期目标',
    role: '上级',
    trigger: '员工提交试用期目标后，系统实时生成待办',
    action: '登录系统，审核目标内容并确认或退回',
    channels: ['邮件', 'WOA', 'OA消息中心'],
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
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '02b_goal_return_employee',
    phase: '目标设定',
    title: '【待办】请修改并重新提交试用期目标',
    role: '员工',
    trigger: '上级退回试用期目标后，系统实时生成待办并通知',
    action: '查看退回原因，修改目标后重新提交',
    channels: ['邮件', 'WOA', 'OA消息中心'],
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
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '03_goal_followup_hrbp_submitted',
    phase: '目标设定',
    title: '【提醒】请跟进上级确认目标进度',
    role: 'HRBP',
    trigger: '入职满 3 个月，员工已提交目标但上级尚未确认',
    action: '联系直属上级，提醒其尽快确认员工目标',
    channels: ['邮件', 'WOA', 'OA消息中心'],
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
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '04_goal_followup_manager_not_submitted',
    phase: '目标设定',
    title: '【提醒】请督促员工提交试用期目标',
    role: '上级',
    trigger: '入职满 3 个月，员工尚未提交试用期目标',
    action: '联系员工，督促其尽快提交试用期目标',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      manager_name: '陈思远',
      employee_name: '王明辉',
      login_url: `${baseUrl}/auth/token?token=mock_token_mgr&redirect=/manager/dashboard`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.manager_name}</strong>，</p>
      <p>您的团队成员 <strong>${vars.employee_name}</strong> 已入职满 3 个月，但尚未提交试用期目标。</p>
      <p>请及时督促员工登录系统完成目标设定，以保障后续评价流程按时推进。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往查看</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '05_goal_followup_hrbp_not_submitted',
    phase: '目标设定',
    title: '【提醒】请跟进员工目标提交情况',
    role: 'HRBP',
    trigger: '入职满 3 个月，员工尚未提交试用期目标',
    action: '联系员工和上级，跟进目标提交进度',
    channels: ['邮件', 'WOA', 'OA消息中心'],
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
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '06_goal_late_submit_notify_manager',
    phase: '目标设定',
    title: '【通知】员工已提交试用期目标',
    role: '上级',
    trigger: '员工提交试用期目标后，系统实时通知',
    action: '登录系统，审核并确认员工目标',
    channels: ['邮件', 'WOA', 'OA消息中心'],
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
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '07_goal_late_submit_notify_hrbp',
    phase: '目标设定',
    title: '【通知】员工已提交试用期目标',
    role: 'HRBP',
    trigger: '员工提交试用期目标后，系统实时通知',
    action: '知悉并跟进后续目标确认进度',
    channels: ['邮件', 'WOA', 'OA消息中心'],
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
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },

  // ============================================================
  // 阶段二：开启试用期评价
  // ============================================================
  {
    id: '08_eval_trigger_hrbp',
    phase: '开启试用期评价',
    title: '【待办】请开启试用期评价',
    role: 'HRBP',
    trigger: '入职满 4.5 个月，且试用期目标已确认',
    action: '登录系统，为该员工开启试用期评价',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      hrbp_name: '刘建国',
      employee_name: '王明辉',
      hire_date: '2025-02-01',
      login_url: `${baseUrl}/auth/token?token=mock_token_hr&redirect=/hrbp/panorama`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.hrbp_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 入职已满 4.5 个月（入职日期：${vars.hire_date}），且试用期目标已确认。</p>
      <p>请及时登录试用期管理系统，开启其试用期评价。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往开启试用期评价</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '08b_goal_unconfirmed_4_5_manager',
    phase: '开启试用期评价',
    title: '【提醒】请尽快确认员工试用期目标',
    role: '上级',
    trigger: '入职满 4.5 个月，员工目标仍未确认',
    action: '登录系统，尽快确认或退回员工目标',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      manager_name: '陈思远',
      employee_name: '王明辉',
      hire_date: '2025-02-01',
      login_url: `${baseUrl}/auth/token?token=mock_token_mgr&redirect=/manager/dashboard`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.manager_name}</strong>，</p>
      <p>您的团队成员 <strong>${vars.employee_name}</strong> 入职已满 4.5 个月（入职日期：${vars.hire_date}），但试用期目标尚未确认。</p>
      <p>请及时登录试用期管理系统，确认目标或退回员工修改，以保障后续试用期评价流程正常推进。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往处理目标</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '08c_goal_unconfirmed_4_5_hrbp',
    phase: '开启试用期评价',
    title: '【提醒】请推动试用期目标确认',
    role: 'HRBP',
    trigger: '入职满 4.5 个月，员工目标仍未确认',
    action: '联系直属上级，推动其尽快确认员工目标',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      hrbp_name: '刘建国',
      employee_name: '王明辉',
      manager_name: '陈思远',
      hire_date: '2025-02-01',
      login_url: `${baseUrl}/auth/token?token=mock_token_hr&redirect=/hrbp/panorama`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.hrbp_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 入职已满 4.5 个月（入职日期：${vars.hire_date}），但试用期目标尚未由直属上级 <strong>${vars.manager_name}</strong> 确认。</p>
      <p>请及时跟进目标确认进度，避免影响后续试用期评价和转正审批流程。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往查看进度</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '09_eval_start_employee',
    phase: '开启试用期评价',
    title: '【待办】请完成试用期自评',
    role: '员工',
    trigger: 'HRBP 开启试用期评价后，系统实时生成自评待办',
    action: '登录系统，完成试用期自评并提交',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      employee_name: '王明辉',
      deadline_date: '2025-07-01',
      login_url: `${baseUrl}/auth/token?token=mock_token_emp&redirect=/employee/self-eval`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.employee_name}</strong>，</p>
      <p>您的试用期评价已开启。</p>
      <p>请及时登录试用期管理系统，进行试用期自评。为了不影响您的转正进度，请不要晚于 <strong>${vars.deadline_date}</strong> 提交。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往填写自评</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '10_eval_notify_manager',
    phase: '开启试用期评价',
    title: '【通知】试用期评价已开启',
    role: '上级',
    trigger: 'HRBP 开启试用期评价后，系统实时通知上级（仅知晓，无待办）',
    action: '知悉评价已开启，待员工自评完成后将收到评价待办',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      manager_name: '陈思远',
      employee_name: '王明辉',
      login_url: `${baseUrl}/auth/token?token=mock_token_mgr&redirect=/manager/dashboard`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.manager_name}</strong>，</p>
      <p>您的团队成员 <strong>${vars.employee_name}</strong> 的试用期评价已开启。</p>
      <p>员工正在进行自评，自评完成后您将收到评价待办通知。当前无需操作。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往查看</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },

  // ============================================================
  // 阶段三：试用期评价
  // ============================================================
  {
    id: '11_eval_todo_manager',
    phase: '试用期评价',
    title: '【待办】请给出试用期评价',
    role: '上级',
    trigger: '员工完成自评提交后，系统实时生成上级评价待办',
    action: '请给出试用期评价',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      manager_name: '陈思远',
      employee_name: '王明辉',
      login_url: `${baseUrl}/auth/token?token=mock_token_mgr&redirect=/manager/evaluation/M001`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.manager_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 已完成试用期自评。</p>
      <p>请给出试用期评价。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往评价</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '12_eval_followup_hrbp',
    phase: '试用期评价',
    title: '【提醒】请跟进上级评价进度',
    role: 'HRBP',
    trigger: '员工自评完成后，系统通知 HRBP 跟进上级评价',
    action: '跟进直属上级完成评价，保障转正流程按时推进',
    channels: ['邮件', 'WOA', 'OA消息中心'],
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
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '13_eval_remind_manager_overdue',
    phase: '试用期评价',
    title: '【提醒】试用期评价即将逾期',
    role: '上级',
    trigger: '入职满 5.5 个月，尚未发起转正审批流程',
    action: '如尚未给出试用期评价，请先完成评价；如已完成，请配合 HRBP 推进发起转正审批流程',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      manager_name: '陈思远',
      employee_name: '王明辉',
      hire_date: '2025-02-01',
      login_url: `${baseUrl}/auth/token?token=mock_token_mgr&redirect=/manager/evaluation/M001`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.manager_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 已入职满 5.5 个月（入职日期：${vars.hire_date}），尚未发起转正审批流程。</p>
      <p>如尚未给出试用期评价，请先完成评价；如已完成，请配合 HRBP 推进发起转正审批流程，避免影响员工转正进度。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往评价</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '14_eval_remind_hrbp_overdue',
    phase: '试用期评价',
    title: '【提醒】试用期评价即将逾期',
    role: 'HRBP',
    trigger: '入职满 5.5 个月，尚未发起转正审批流程',
    action: '发起转正审批流程；如自评或上级评价尚未完成，请同步推动前序环节完成',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      hrbp_name: '刘建国',
      employee_name: '王明辉',
      hire_date: '2025-02-01',
      login_url: `${baseUrl}/auth/token?token=mock_token_hr&redirect=/hrbp/panorama`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.hrbp_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 已入职满 5.5 个月（入职日期：${vars.hire_date}），尚未发起转正审批流程。</p>
      <p>请尽快发起转正审批流程；如自评或上级评价尚未完成，请同步推动前序环节完成。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往发起流程</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: 'eval_pass_notify_hrbp',
    phase: '试用期评价',
    title: '【待办】请发起转正审批流程',
    role: 'HRBP',
    trigger: '上级提交通过类试用期评价后',
    action: '登录系统，发起转正审批流程',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      hrbp_name: '刘建国',
      employee_name: '王明辉',
      manager_name: '陈思远',
      conclusion: '通过（符合预期）',
      login_url: `${baseUrl}/auth/token?token=mock_token_hr&redirect=/hrbp/panorama`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.hrbp_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 的直属上级 <strong>${vars.manager_name}</strong> 已完成试用期评价，评价结论为 <strong>${vars.conclusion}</strong>。</p>
      <p>请及时登录试用期管理系统，发起转正审批流程。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">发起转正审批流程</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  // ============================================================
  // B6-NOTICE-001: 上级评价不通过后通知 HRBP
  // ============================================================
  {
    id: 'eval_reject_notify_hrbp',
    phase: '试用期评价',
    title: '【试用期评价】{员工姓名} 评价不通过通知',
    role: 'HRBP',
    trigger: '上级提交评价为"不通过（不符合转正条件）"时',
    action: '跟进后续人事处理',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      hrbp_name: '刘建国',
      employee_name: '王明辉',
      manager_name: '陈思远',
      login_url: `${baseUrl}/auth/token?token=mock_token_hr&redirect=/hrbp/panorama`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.hrbp_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 的试用期评价已完成，其直属上级 <strong>${vars.manager_name}</strong> 的评价结论为 <strong>不通过（不符合转正条件）</strong>。</p>
      <p>该员工已进入不开启/终止状态，请及时跟进后续人事处理工作。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往跟进处理</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  // ============================================================
  // B6-NOTICE-002: 5.5 个月未发起审批通知 HRD 和 HRBP head
  // ============================================================
  {
    id: 'approval_delay_notify_hrd_hrbp_head',
    phase: '试用期评价',
    title: '【转正流程延迟】{员工姓名} 转正流程尚未发起',
    role: 'HRD, HRBP head',
    trigger: '员工入职满 5.5 个月且仍未发起转正流程',
    action: '推动 HRBP 发起转正流程',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      recipient_name: '张总',
      employee_name: '王明辉',
      hire_date: '2025-02-01',
      hrbp_name: '刘建国',
      login_url: `${baseUrl}/auth/token?token=mock_token_hrd&redirect=/hrd/dashboard`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.recipient_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 已入职超过 5.5 个月（入职日期：${vars.hire_date}），但转正流程尚未发起。</p>
      <p>请及时关注并推动 HRBP（${vars.hrbp_name}）发起该员工的转正流程，避免影响员工转正进度。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往推动流程</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  // ============================================================
  // 阶段四：转正审批流程
  // ============================================================
  {
    id: '15_approval_todo_approver',
    phase: '转正审批流程',
    title: '【待办】请处理转正审批',
    role: '审批人',
    trigger: 'HRBP 发起转正流程后，系统实时生成审批待办',
    action: '登录系统，查看审批单并给出审批意见',
    channels: ['邮件', 'OTP', 'OTP待处理', 'OA消息中心'],
    defaultVars: {
      approver_name: '赵总',
      employee_name: '王明辉',
      hrbp_name: '刘建国',
      login_url: `${baseUrl}/auth/token?token=mock_token_approver&redirect=/approver/center`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.approver_name}</strong>，</p>
      <p>HRBP（${vars.hrbp_name}）已为员工 <strong>${vars.employee_name}</strong> 发起转正流程。</p>
      <p>请您登录试用期管理系统，查看审批单并处理。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往审批</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📱 审批支持移动端处理</p>
    `
  },
  {
    id: '16_approval_done_notify_hrbp',
    phase: '转正审批流程',
    title: '【通知】转正审批已通过',
    role: 'HRBP',
    trigger: '审批人通过转正审批后，系统实时通知 HRBP',
    action: '知悉审批结果；如未到身份变更时间，记录进入待发布',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      hrbp_name: '刘建国',
      employee_name: '王明辉',
      login_url: `${baseUrl}/auth/token?token=mock_token_hr&redirect=/hrbp/panorama`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.hrbp_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 的转正审批已通过。</p>
      <p>如员工尚未到身份变更时间，记录将进入“待发布”；如已到或超过 6 个月试用期节点，系统将立即完成身份变更并自动发布转正结果。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往查看</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '17_approval_reject_notify_hrbp',
    phase: '转正审批流程',
    title: '【通知】转正审批已驳回',
    role: 'HRBP',
    trigger: '审批人驳回转正审批后，系统实时通知 HRBP',
    action: '登录系统，查看驳回原因并跟进处理',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      hrbp_name: '刘建国',
      employee_name: '王明辉',
      approver_name: '赵总',
      login_url: `${baseUrl}/auth/token?token=mock_token_hr&redirect=/hrbp/panorama`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.hrbp_name}</strong>，</p>
      <p>员工 <strong>${vars.employee_name}</strong> 的转正审批已被 <strong>${vars.approver_name}</strong> 驳回。</p>
      <p>请登录系统查看驳回原因并跟进处理。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往查看</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '18_approval_result_notify_manager',
    phase: '转正审批流程',
    title: '【通知】转正审批结果通知',
    role: '上级',
    trigger: '审批完成后，系统实时通知直属上级审批结果',
    action: '知悉审批结果',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      manager_name: '陈思远',
      employee_name: '王明辉',
      result: '通过',
      login_url: `${baseUrl}/auth/token?token=mock_token_mgr&redirect=/manager/dashboard`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.manager_name}</strong>，</p>
      <p>您团队成员 <strong>${vars.employee_name}</strong> 的转正审批已 <strong>${vars.result}</strong>。</p>
      <p>详情请登录系统查看。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">前往查看</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  },
  {
    id: '20_result_notify_employee',
    phase: '转正审批流程',
    title: '【通知】您的转正结果已发布',
    role: '员工',
    trigger: '员工身份由试用员工变更为正式员工后，系统自动发布结果并实时通知员工；若审批通过时已到或超过 6 个月则立即触发',
    action: '登录系统，查看试用期结果',
    channels: ['邮件', 'WOA', 'OA消息中心'],
    defaultVars: {
      employee_name: '王明辉',
      login_url: `${baseUrl}/auth/token?token=mock_token_emp&redirect=/employee/dashboard`
    },
    renderBody: (vars) => `
      <p>亲爱的 <strong>${vars.employee_name}</strong>，</p>
      <p>恭喜您！您的试用期转正审批已通过，系统已自动发布转正结果。</p>
      <p>您可以登录系统查看试用期结果和试用期评价结果。</p>
      <div style="text-align: center;">
        <a href="${vars.login_url}" target="_blank" class="email-button">查看转正结果</a>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 16px;">📌 WOA 待办消息：仅限 PC 端打开</p>
    `
  }
];

/** 按阶段分组，供页面侧边栏使用 */
export const phaseGroups: { phase: Phase; description: string }[] = [
  { phase: '目标设定', description: '员工提交目标 → 上级确认 → HRBP 跟进' },
  { phase: '开启试用期评价', description: 'HRBP 开启试用期评价 → 员工自评 → 上级知晓' },
  { phase: '试用期评价', description: '上级评价 → HRBP 跟进 → 逾期提醒' },
  { phase: '转正审批流程', description: 'HRBP 发起审批 → 审批人处理 → 结果发布' }
];
