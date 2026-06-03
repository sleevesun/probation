/**
 * 首页方案资料入口配置
 *
 * 新增资料入口时，只需在此数组追加一条记录，首页模板无需修改。
 * 所有封面图请放入 public/assets/ 并使用相对路径；外链使用 HTTPS。
 */

export interface ResourceEntry {
  /** 唯一标识，用于 key 和样式区分 */
  id: string
  /** 资料标题 */
  title: string
  /** 一句话说明资料内容 */
  description: string
  /** 封面图路径（相对于 public 目录） */
  cover: string
  /** 跳转链接，优先使用 HTTPS 在线地址 */
  href: string
  /** 按钮文案 */
  actionText: string
  /** 外部链接标记，true 时在新窗口打开 */
  external?: boolean
  /** 卡片视觉风格标识 */
  styleVariant?: 'ppt' | 'flow' | 'doc'
}

export const resourceEntries: ResourceEntry[] = [
  {
    id: 'ppt-diagnosis',
    title: '试用期管理诊断 & 方案探讨',
    description: '汇报 PPT，涵盖现状诊断、方案设计与落地路径。',
    cover: '/assets/ppt-cover.svg',
    href: 'https://docs.oa.wanmei.net/weboffice/l/srtynAvOdlKCg',
    actionText: '查看 PPT',
    external: true,
    styleVariant: 'ppt',
  },
  {
    id: 'flow-probation',
    title: '试用期转正管理流程',
    description: '端到端业务流程图，覆盖目标设定、过程跟踪、评价审批到结果发布。',
    cover: '/assets/flow-cover.svg',
    href: 'https://docs.oa.wanmei.net/weboffice/l/s7T1en62AgCPH',
    actionText: '查看流程图',
    external: true,
    styleVariant: 'flow',
  },
]
