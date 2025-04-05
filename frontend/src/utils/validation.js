/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
export const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };
  
  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result with details
   */
  export const validatePassword = (password) => {
    const result = {
      isValid: true,
      errors: []
    };
  
    // Minimum length
    if (password.length < 8) {
      result.isValid = false;
      result.errors.push('Password must be at least 8 characters long');
    }
  
    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      result.isValid = false;
      result.errors.push('Password must contain at least one uppercase letter');
    }
  
    // Lowercase check
    if (!/[a-z]/.test(password)) {
      result.isValid = false;
      result.errors.push('Password must contain at least one lowercase letter');
    }
  
    // Number check
    if (!/[0-9]/.test(password)) {
      result.isValid = false;
      result.errors.push('Password must contain at least one number');
    }
  
    // Special character check
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.isValid = false;
      result.errors.push('Password must contain at least one special character');
    }
  
    return result;
  };
  
  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @returns {boolean} Whether URL is valid
   */
  export const validateUrl = (url) => {
    const re = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    return re.test(String(url).toLowerCase());
  };
  
  /**
   * Validate phone number
   * @param {string} phone - Phone number to validate
   * @returns {boolean} Whether phone number is valid
   */
  export const validatePhone = (phone) => {
    const re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return re.test(String(phone));
  };
  
  /**
   * Validate credit card number
   * @param {string} cardNumber - Credit card number to validate
   * @returns {boolean} Whether credit card number is valid
   */
  export const validateCreditCard = (cardNumber) => {
    // Remove non-digit characters
    const cleanNumber = cardNumber.replace(/\D/g, '');
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber.charAt(i), 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return (sum % 10) === 0;
  };
  
  /**
   * Validate name (first or last)
   * @param {string} name - Name to validate
   * @returns {boolean} Whether name is valid
   */
  export const validateName = (name) => {
    const re = /^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ∂ð ,.'-]+$/u;
    return re.test(String(name).trim());
  };
  
  /**
   * Validate form fields
   * @param {Object} fields - Key-value pairs of fields to validate
   * @param {Object} validationRules - Validation rules for each field
   * @returns {Object} Validation result
   */
  export const validateForm = (fields, validationRules) => {
    const errors = {};
  
    Object.keys(validationRules).forEach(field => {
      const value = fields[field];
      const rules = validationRules[field];
  
      // Required check
      if (rules.required && (!value || value.trim() === '')) {
        errors[field] = `${field} is required`;
        return;
      }
  
      // Custom validation
      if (rules.validate && typeof rules.validate === 'function') {
        const customValidation = rules.validate(value);
        if (!customValidation.isValid) {
          errors[field] = customValidation.error;
        }
      }
  
      // Type-specific validations
      if (value) {
        switch (rules.type) {
          case 'email':
            if (!validateEmail(value)) {
              errors[field] = 'Invalid email address';
            }
            break;
          case 'password':
            const passwordValidation = validatePassword(value);
            if (!passwordValidation.isValid) {
              errors[field] = passwordValidation.errors[0];
            }
            break;
          case 'url':
            if (!validateUrl(value)) {
              errors[field] = 'Invalid URL';
            }
            break;
          case 'phone':
            if (!validatePhone(value)) {
              errors[field] = 'Invalid phone number';
            }
            break;
        }
      }
    });
  
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };