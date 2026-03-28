import { useMemo } from 'react';
import { normalizePhoneToEnglish } from '../utils/phoneUtils';
import { evaluatePassword } from './passwordPolicy';

const DIGIT_REGEX = /\d/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UseSignupValidationParams {
  phone: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const useSignupValidation = ({
  phone,
  name,
  email,
  password,
  confirmPassword,
}: UseSignupValidationParams) => {
  const normalizedPhone = normalizePhoneToEnglish(phone);
  const digitsOnlyForValidation = normalizedPhone.replace(/\D/g, '').slice(0, 9);

  return useMemo(() => {
    const phoneValid =
      digitsOnlyForValidation.length === 9 && digitsOnlyForValidation.startsWith('5');
    const nameValid = !DIGIT_REGEX.test(name) && name.length > 0;
    const emailValid = email.length > 0 && EMAIL_REGEX.test(email.toLowerCase());
    const { rules: passwordRules, isValid: passwordValid } = evaluatePassword(password);
    const confirmValid = confirmPassword.length > 0 && password === confirmPassword;

    return {
      values: {
        phone: digitsOnlyForValidation,
      },
      flags: {
        phoneValid,
        nameValid,
        emailValid,
        passwordRules,
        passwordValid,
        confirmValid,
      },
    };
  }, [confirmPassword, digitsOnlyForValidation, email, name, password]);
};

export type SignupValidationResult = ReturnType<typeof useSignupValidation>;
