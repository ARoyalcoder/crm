import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  children: ReactNode
  /** Changing this value (e.g. the route path) clears a previous error so navigation recovers. */
  resetKey?: string
}

type State = { error: Error | null; resetKey?: string }

/** Catches render errors below it so one broken page shows a message instead of a blank screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
        <CircleAlert className="size-8 text-destructive" aria-hidden="true" />
        <h1 className="text-lg font-semibold">This page hit an unexpected error</h1>
        <p className="text-sm text-muted-foreground">Your data is safe. Reload, or go back and try again.</p>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Button variant="outline" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </div>
      </div>
    )
  }
}
