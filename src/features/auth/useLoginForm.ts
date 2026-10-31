import { useRef, useState } from 'react';
import type { TextInputInstance } from 'react-native';

import { dismissExpiredNotice } from './sessionActions';
import { useExpiredEmail } from './sessionStore';
import { useLoginSubmit } from './useLoginSubmit';
import { validateEmail, validateLogin, validatePassword } from './validateLogin';
import type { LoginErrors, LoginField } from './validateLogin';

const FIELD_VALIDATORS: Record<LoginField, (raw: string) => string | undefined> = {
  email: validateEmail,
  password: validatePassword,
};

function recheckField(errors: LoginErrors, field: LoginField, value: string): LoginErrors {
  if (!errors[field]) return errors;
  const { [field]: _previous, ...others } = errors;
  const message = FIELD_VALIDATORS[field](value);
  return message ? { ...others, [field]: message } : others;
}

export function useLoginForm() {
  const expiredEmail = useExpiredEmail();
  const [email, setEmail] = useState(() => expiredEmail ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const { send, submitting, serverError, clearServerError } = useLoginSubmit();
  const focusPassword = () => passwordRef.current?.focus();

  const changeField = (field: LoginField, setValue: (text: string) => void) => (text: string) => {
    setValue(text);
    clearServerError();
    setErrors((current) => recheckField(current, field, text));
  };

  function submit(): void {
    dismissExpiredNotice();
    clearServerError();
    const found = validateLogin({ email, password });
    setErrors(found);
    if (found.email) emailRef.current?.focus();
    else if (found.password) focusPassword();
    else void send(email, password);
  }

  return {
    email,
    password,
    errors,
    changeEmail: changeField('email', setEmail),
    changePassword: changeField('password', setPassword),
    focusPassword,
    submit,
    submitting,
    serverError,
    emailRef,
    passwordRef,
  };
}
