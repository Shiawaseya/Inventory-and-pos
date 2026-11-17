import {create} from 'zustand';

type ViewState = {
    isLoginView: boolean;
    isSignupView: boolean;
    isResetPasswordView: boolean;
    setLoginView: () => void;
    setSignupView: () => void;
    setResetPasswordView: () => void;
};

export const useViewStore = create<ViewState>((set) => ({
    isLoginView: true,
    isSignupView: false,
    isResetPasswordView: false,
    setLoginView: () => set({ isLoginView: true, isSignupView: false, isResetPasswordView: false }),
    setSignupView: () => set({ isLoginView: false, isSignupView: true, isResetPasswordView: false }),
    setResetPasswordView: () => set({ isLoginView: false, isSignupView: false, isResetPasswordView: true }),
}));