import React from "react";
import DatePicker from "react-multi-date-picker";
import { Controller, Control, FieldValues } from "react-hook-form";

interface DateInputProps {
  control: Control<FieldValues>;
  className?: string;
  name: string; 
}


const DateInput: React.FC<DateInputProps> = ({ control, className, name }) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <div>
          <DatePicker
            value={value || ""}
            onChange={(date) => {
              console.log("Selected Date:", date?.format?.() || date); // Debugging
              onChange(date?.isValid ? date.toDate() : null); // Pass the Date object correctly
            }}
            inputClass={className}
          />
          {error && <span className="text-red-500">{error.message}</span>}
        </div>
      )}
    />
  );
};

export default DateInput;
