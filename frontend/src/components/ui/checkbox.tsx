import * as React from "react"
import styled from "styled-components"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "checked" | "onChange"> {
  checked?: boolean | "indeterminate"
  defaultChecked?: boolean
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean | "indeterminate") => void
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  label?: React.ReactNode
  wrapperClassName?: string
}

const StyledWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  vertical-align: middle;

  .checkbox-wrapper-46 {
    display: inline-flex;
    align-items: center;
    line-height: 1;
    position: relative;
  }

  .checkbox-wrapper-46 input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    margin: 0;
    pointer-events: none;
  }

  .checkbox-wrapper-46 .cbx {
    margin: auto;
    -webkit-user-select: none;
    user-select: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
  }

  .checkbox-wrapper-46 .cbx.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .checkbox-wrapper-46 .cbx span {
    display: inline-block;
    vertical-align: middle;
    transform: translate3d(0, 0, 0);
  }

  .checkbox-wrapper-46 .cbx span:first-child {
    position: relative;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    transform: scale(1);
    vertical-align: middle;
    border: 1px solid #9098a9;
    transition: all 0.2s ease;
    overflow: hidden;
    flex-shrink: 0;
    box-sizing: border-box;
  }

  .checkbox-wrapper-46 .cbx span:first-child svg {
    position: absolute;
    top: 3px;
    left: 2px;
    fill: none;
    stroke: #ffffff;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 16px;
    stroke-dashoffset: 16px;
    transition: all 0.3s ease;
    transition-delay: 0.1s;
    transform: translate3d(0, 0, 0);
  }

  .checkbox-wrapper-46 .cbx span:first-child:before {
    content: "";
    width: 100%;
    height: 100%;
    background: #506eec;
    display: block;
    transform: scale(0);
    opacity: 1;
    border-radius: 50%;
  }

  .checkbox-wrapper-46 .cbx span.cbx-lbl {
    padding-left: 8px;
    font-size: 0.875rem;
    color: inherit;
  }

  .checkbox-wrapper-46 .cbx:hover:not(.disabled) span:first-child {
    border-color: #506eec;
  }

  .checkbox-wrapper-46 .inp-cbx:checked + .cbx span:first-child,
  .checkbox-wrapper-46 .inp-cbx[data-indeterminate="true"] + .cbx span:first-child {
    background: #506eec;
    border-color: #506eec;
    animation: wave-46 0.4s ease;
  }

  .checkbox-wrapper-46 .inp-cbx:checked + .cbx span:first-child svg,
  .checkbox-wrapper-46 .inp-cbx[data-indeterminate="true"] + .cbx span:first-child svg {
    stroke-dashoffset: 0;
  }

  .checkbox-wrapper-46 .inp-cbx:checked + .cbx span:first-child:before,
  .checkbox-wrapper-46 .inp-cbx[data-indeterminate="true"] + .cbx span:first-child:before {
    transform: scale(3.5);
    opacity: 0;
    transition: all 0.6s ease;
  }

  .checkbox-wrapper-46 .inp-cbx:focus-visible + .cbx span:first-child {
    outline: 2px solid #506eec;
    outline-offset: 2px;
  }

  @keyframes wave-46 {
    50% {
      transform: scale(0.9);
    }
  }
`

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      id,
      className,
      wrapperClassName,
      checked,
      defaultChecked,
      indeterminate,
      disabled,
      onChange,
      onCheckedChange,
      label,
      children,
      onClick,
      ...props
    },
    forwardedRef
  ) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const innerRef = React.useRef<HTMLInputElement | null>(null)

    const isIndeterminate = indeterminate || checked === "indeterminate"
    const isChecked = isIndeterminate ? false : checked !== undefined ? Boolean(checked) : undefined

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = Boolean(isIndeterminate)
      }
    }, [isIndeterminate])

    const handleRef = (node: HTMLInputElement | null) => {
      innerRef.current = node
      if (typeof forwardedRef === "function") {
        forwardedRef(node)
      } else if (forwardedRef) {
        ;(forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      onCheckedChange?.(e.target.checked)
    }

    const content = label || children

    return (
      <StyledWrapper className={cn("checkbox-styled-root", wrapperClassName)}>
        <div className="checkbox-wrapper-46">
          <input
            ref={handleRef}
            type="checkbox"
            id={inputId}
            className={cn("inp-cbx", className)}
            checked={isChecked}
            defaultChecked={defaultChecked}
            disabled={disabled}
            data-indeterminate={isIndeterminate ? "true" : undefined}
            onChange={handleChange}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn("cbx", disabled && "disabled")}
            onClick={onClick ? (e) => onClick(e as unknown as React.MouseEvent<HTMLInputElement>) : undefined}
          >
            <span>
              <svg viewBox="0 0 12 10" height="10px" width="12px">
                {isIndeterminate ? (
                  <line x1="2" y1="5" x2="10" y2="5" />
                ) : (
                  <polyline points="1.5 6 4.5 9 10.5 1" />
                )}
              </svg>
            </span>
            {content ? <span className="cbx-lbl">{content}</span> : null}
          </label>
        </div>
      </StyledWrapper>
    )
  }
)

Checkbox.displayName = "Checkbox"

export { Checkbox }
export default Checkbox
