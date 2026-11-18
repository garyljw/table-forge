import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "wouter";

/** Catches a render error so one bad record can never blank the whole app. */
export class ErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { failed: boolean; resetKey: string }
> {
  override state = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  /** Moving to another path or query clears the error. The tree is not remounted, so typing in a search box keeps focus. */
  static getDerivedStateFromProps(props: { resetKey: string }, state: { failed: boolean; resetKey: string }) {
    return props.resetKey === state.resetKey ? null : { failed: false, resetKey: props.resetKey };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Render error", error, info.componentStack);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="state state-error" role="alert">
        <p>Something went wrong showing this page.</p>
        <Link className="button-link" href="/">
          Back to the start
        </Link>
      </div>
    );
  }
}
