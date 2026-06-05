export const psDecisionColor = (decision?: string) => {
  if (decision === '不符合转正条件') return '#d14343'
  if (decision === '超出预期') return '#2f6f58'
  return '#b36a00'
}

export const psEvalTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    self: '员工自评',
    manager: '直属上级评价',
    hrbp: 'HRBP评价',
    invited: '邀评记录'
  }
  return map[type] || type
}

export const psStatusText = (status: string) => {
  const map: Record<string, string> = {
    '01': '待设定目标',
    '02': '目标待确认',
    '03': '目标已确认',
    '04': '待开启试用期评价',
    '05': '待员工自评',
    '06': '待上级评价',
    '07': '待发起转正审批流程',
    '08': '审批中',
    '09': '待发布结果',
    '10': '已完成',
    '99': '终止转正'
  }
  return map[status] || status
}

/** 员工端专用状态文本，隐藏后台流程细节 */
export const psEmployeeStatusText = (status: string) => {
  const map: Record<string, string> = {
    '01': '待设定目标',
    '02': '目标待确认',
    '03': '目标已确认',
    '04': '目标已确认',
    '05': '待填写试用期评价',
    '06': '试用期评估中',
    '07': '试用期评估中',
    '08': '试用期评估中',
    '09': '试用期评估中',
    '10': '已完成',
    '99': '终止转正'
  }
  return map[status] || status
}
