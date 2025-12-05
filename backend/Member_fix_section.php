<?php
/**
 * Correct Member.php methods - copy these to production
 * This is the correct code for lines 282-315
 */

// Replace the isProfileComplete and getMissingProfileFields methods with this:

    /**
     * Check if member profile is complete
     * Required fields: name, phone, email, id_number, church, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship
     */
    public function isProfileComplete(): bool
    {
        return !empty($this->name) &&
               !empty($this->phone) &&
               !empty($this->email) &&
               !empty($this->id_number) &&
               !empty($this->church) &&
               !empty($this->next_of_kin_name) &&
               !empty($this->next_of_kin_phone) &&
               !empty($this->next_of_kin_relationship);
    }

    /**
     * Get list of missing profile fields
     */
    public function getMissingProfileFields(): array
    {
        $missing = [];
        
        if (empty($this->name)) $missing[] = 'name';
        if (empty($this->phone)) $missing[] = 'phone';
        if (empty($this->email)) $missing[] = 'email';
        if (empty($this->id_number)) $missing[] = 'id_number';
        if (empty($this->church)) $missing[] = 'church';
        if (empty($this->next_of_kin_name)) $missing[] = 'next_of_kin_name';
        if (empty($this->next_of_kin_phone)) $missing[] = 'next_of_kin_phone';
        if (empty($this->next_of_kin_relationship)) $missing[] = 'next_of_kin_relationship';
        
        return $missing;
    }

