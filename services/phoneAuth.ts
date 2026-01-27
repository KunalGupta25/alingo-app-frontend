import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';

// Store the reCAPTCHA verifier and confirmation result globally
let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmationResult: ConfirmationResult | null = null;

export const getRecaptchaVerifier = () => recaptchaVerifier;
export const setRecaptchaVerifier = (verifier: RecaptchaVerifier | null) => {
    recaptchaVerifier = verifier;
};

export const getConfirmationResult = () => confirmationResult;
export const setConfirmationResult = (result: ConfirmationResult | null) => {
    confirmationResult = result;
};
