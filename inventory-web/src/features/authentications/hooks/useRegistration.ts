import { useState } from "react";
import {
  teamRegistrationApi,
  type TeamRegistrationRequest,
} from "../api/teamRegistrationApi";
import type { registrationError } from "../types/error";
import {
  getEmailError,
  getPasswordError,
  getPhoneError,
} from "@/lib/passwordPolicy";

function useRegistration() {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [pin, setPin] = useState("");
  const [branchId, setBranchId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState<registrationError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (
      !firstName ||
      !lastName ||
      !username ||
      !email ||
      !contactNumber ||
      !pin ||
      !branchId ||
      !roleId
    ) {
      setError({
        message: "Please complete all required fields",
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const emailError = getEmailError(email);
    if (emailError) {
      setError({ message: emailError, code: "INVALID_EMAIL" });
      return;
    }

    const phoneError = getPhoneError(contactNumber);
    if (phoneError) {
      setError({ message: phoneError, code: "INVALID_CONTACT_NUMBER" });
      return;
    }

    const passwordError = getPasswordError(pin);
    if (passwordError) {
      setError({ message: passwordError, code: "INVALID_PASSWORD" });
      return;
    }

    const payload: TeamRegistrationRequest = {
      first_name: firstName.trim(),
      middle_name: middleName.trim() || undefined,
      last_name: lastName.trim(),
      username: username.trim(),
      email: email.trim(),
      contact_number: contactNumber.trim(),
      pin,
      branch_id: Number(branchId),
      role_id: Number(roleId),
    };

    setIsLoading(true);
    try {
      const response = await teamRegistrationApi.register(payload);
      setSuccessMessage(
        response.message ||
          "Registration submitted successfully. Awaiting approval.",
      );
    } catch (submitError) {
      setError({
        message:
          submitError instanceof Error
            ? submitError.message
            : "Registration failed",
        code: "REGISTRATION_FAILED",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    firstName,
    setFirstName,
    middleName,
    setMiddleName,
    lastName,
    setLastName,
    username,
    setUsername,
    email,
    setEmail,
    contactNumber,
    setContactNumber,
    pin,
    setPin,
    branchId,
    setBranchId,
    roleId,
    setRoleId,
    handleSubmit,
    error,
    successMessage,
    isLoading,
  };
}

export default useRegistration;
