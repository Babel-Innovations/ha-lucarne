import { css } from 'lit';

/**
 * Native checkboxes and select arrows follow the OS color-scheme, so on a light HA
 * theme with a dark OS the checkbox renders as a solid black box (#36). Draw both
 * from theme tokens instead.
 */
export const themedCheckboxStyles = css`
  input[type='checkbox'] {
    appearance: none;
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    margin: 0;
    flex-shrink: 0;
    position: relative;
    cursor: pointer;
    border: 2px solid var(--lucarne-on-surface-muted, #727272);
    border-radius: 4px;
    background: var(--lucarne-surface, var(--ha-card-background, #fff));
  }
  input[type='checkbox']:checked {
    background: var(--primary-color, #03a9f4);
    border-color: var(--primary-color, #03a9f4);
  }
  input[type='checkbox']:checked::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 45%;
    width: 4px;
    height: 8px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: translate(-50%, -50%) rotate(45deg);
  }
  input[type='checkbox']:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 1px;
  }
`;

/** A native select draws its arrow flush against the border; this one honours padding. */
export const themedSelectStyles = css`
  select {
    appearance: none;
    -webkit-appearance: none;
    padding-right: 40px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5' fill='none' stroke='%23727272' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 16px center;
    background-size: 12px 8px;
  }
`;
