'use client';

type Props = {
  message: string;
  className?: string;
  children: React.ReactNode;
  form?: string;
};

export function ConfirmButton({ message, className, children, form }: Props) {
  return (
    <button
      type="submit"
      form={form}
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
