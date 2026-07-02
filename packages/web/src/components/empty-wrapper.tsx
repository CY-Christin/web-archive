import Empty from './empty'

interface EmptyWrapperProps {
  children: React.ReactNode
  empty: boolean
  /** Optional copy overrides for the empty state (defaults to the generic archive copy). */
  title?: string
  desc?: string
}

function EmptyWrapper({ children, empty, title, desc }: EmptyWrapperProps) {
  return empty ? <Empty className="h-full" title={title} desc={desc} /> : children
}

export default EmptyWrapper
