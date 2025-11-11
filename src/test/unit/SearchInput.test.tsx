import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SearchInput } from "@/components/queries/SearchInput";

// Helper component to simulate real-world controlled behavior
function TestWrapper({
  initialValue = "",
  onChangeSpy,
}: {
  initialValue?: string;
  onChangeSpy?: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    onChangeSpy?.(newValue);
  };

  return <SearchInput value={value} onChange={handleChange} />;
}

describe("SearchInput", () => {
  describe("Rendering", () => {
    it("should render with default placeholder", () => {
      const mockOnChange = vi.fn();
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByRole("searchbox", { name: /search queries/i });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "Search queries...");
    });

    it("should render with custom placeholder", () => {
      const mockOnChange = vi.fn();
      const customPlaceholder = "Find your query...";
      render(<SearchInput value="" onChange={mockOnChange} placeholder={customPlaceholder} />);

      const input = screen.getByRole("searchbox");
      expect(input).toHaveAttribute("placeholder", customPlaceholder);
    });

    it("should display the provided value", () => {
      const mockOnChange = vi.fn();
      const testValue = "test query";
      render(<SearchInput value={testValue} onChange={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      expect(input).toHaveValue(testValue);
    });

    it("should have proper ARIA label for accessibility", () => {
      const mockOnChange = vi.fn();
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText("Search queries");
      expect(input).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("should call onChange when user types", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      render(<TestWrapper onChangeSpy={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      await user.type(input, "test");

      expect(mockOnChange).toHaveBeenCalledTimes(4);
      expect(mockOnChange).toHaveBeenNthCalledWith(1, "t");
      expect(mockOnChange).toHaveBeenNthCalledWith(2, "te");
      expect(mockOnChange).toHaveBeenNthCalledWith(3, "tes");
      expect(mockOnChange).toHaveBeenNthCalledWith(4, "test");
      expect(input).toHaveValue("test");
    });

    it("should call onChange with empty string when input is cleared", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      render(<SearchInput value="existing text" onChange={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      await user.clear(input);

      expect(mockOnChange).toHaveBeenCalledWith("");
    });

    it("should handle rapid typing", async () => {
      const user = userEvent.setup({ delay: 1 });
      const mockOnChange = vi.fn();
      render(<TestWrapper onChangeSpy={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      await user.type(input, "quick");

      expect(mockOnChange).toHaveBeenCalledTimes(5);
      expect(mockOnChange).toHaveBeenLastCalledWith("quick");
      expect(input).toHaveValue("quick");
    });

    it("should handle paste events", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      await user.click(input);
      await user.paste("pasted text");

      expect(mockOnChange).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenLastCalledWith("pasted text");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string value", () => {
      const mockOnChange = vi.fn();
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      expect(input).toHaveValue("");
    });

    it("should handle very long input values", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const longText = "a".repeat(100); // Reduced to avoid timeout
      render(<TestWrapper onChangeSpy={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      await user.type(input, longText);

      expect(mockOnChange).toHaveBeenCalledTimes(100);
      expect(mockOnChange).toHaveBeenLastCalledWith(longText);
      expect(input).toHaveValue(longText);
    });

    it("should handle special characters", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      render(<TestWrapper onChangeSpy={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      await user.type(input, "!@#");

      expect(mockOnChange).toHaveBeenCalledTimes(3);
      expect(mockOnChange).toHaveBeenNthCalledWith(1, "!");
      expect(mockOnChange).toHaveBeenNthCalledWith(2, "!@");
      expect(mockOnChange).toHaveBeenNthCalledWith(3, "!@#");
      expect(input).toHaveValue("!@#");
    });

    it("should handle unicode characters", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      await user.type(input, "あ");

      expect(mockOnChange).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith("あ");
    });

    it("should handle whitespace-only input", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      render(<TestWrapper onChangeSpy={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      await user.type(input, "   ");

      expect(mockOnChange).toHaveBeenCalledTimes(3);
      expect(mockOnChange).toHaveBeenNthCalledWith(1, " ");
      expect(mockOnChange).toHaveBeenNthCalledWith(2, "  ");
      expect(mockOnChange).toHaveBeenNthCalledWith(3, "   ");
      expect(input).toHaveValue("   ");
    });

    it("should handle leading and trailing spaces", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      render(<TestWrapper onChangeSpy={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      await user.type(input, " test ");

      expect(mockOnChange).toHaveBeenCalledTimes(6);
      expect(mockOnChange).toHaveBeenNthCalledWith(1, " ");
      expect(mockOnChange).toHaveBeenNthCalledWith(6, " test ");
      expect(input).toHaveValue(" test ");
    });

    it("should handle null-like placeholder gracefully", () => {
      const mockOnChange = vi.fn();
      render(<SearchInput value="" onChange={mockOnChange} placeholder={undefined} />);

      const input = screen.getByRole("searchbox");
      expect(input).toHaveAttribute("placeholder", "Search queries...");
    });
  });

  describe("Controlled Component Behavior", () => {
    it("should remain controlled when value prop is provided", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const { rerender } = render(<SearchInput value="initial" onChange={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      expect(input).toHaveValue("initial");

      await user.type(input, "x");
      expect(mockOnChange).toHaveBeenCalledWith("initialx");

      // Simulate parent component not updating the value
      rerender(<SearchInput value="initial" onChange={mockOnChange} />);
      expect(input).toHaveValue("initial");
    });

    it("should update when value prop changes", () => {
      const mockOnChange = vi.fn();
      const { rerender } = render(<SearchInput value="first" onChange={mockOnChange} />);

      let input = screen.getByRole("searchbox");
      expect(input).toHaveValue("first");

      rerender(<SearchInput value="second" onChange={mockOnChange} />);
      input = screen.getByRole("searchbox");
      expect(input).toHaveValue("second");
    });
  });

  describe("Input Type and Attributes", () => {
    it("should have type='search'", () => {
      const mockOnChange = vi.fn();
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      expect(input).toHaveAttribute("type", "search");
    });

    it("should be focusable", () => {
      const mockOnChange = vi.fn();
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      input.focus();
      expect(input).toHaveFocus();
    });

    it("should be blurable", async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      render(<SearchInput value="" onChange={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      await user.click(input);
      expect(input).toHaveFocus();

      await user.tab();
      expect(input).not.toHaveFocus();
    });
  });

  describe("Performance", () => {
    it("should not cause unnecessary re-renders with stable onChange", () => {
      const mockOnChange = vi.fn();
      const { rerender } = render(<SearchInput value="test" onChange={mockOnChange} />);

      const input = screen.getByRole("searchbox");
      const initialInput = input;

      rerender(<SearchInput value="test" onChange={mockOnChange} />);

      expect(screen.getByRole("searchbox")).toBe(initialInput);
    });

    it("should handle onChange callback changes", async () => {
      const user = userEvent.setup();
      const mockOnChange1 = vi.fn();
      const mockOnChange2 = vi.fn();
      const { rerender } = render(<SearchInput value="test" onChange={mockOnChange1} />);

      rerender(<SearchInput value="test" onChange={mockOnChange2} />);

      const input = screen.getByRole("searchbox");
      await user.type(input, "x");

      expect(mockOnChange1).not.toHaveBeenCalled();
      expect(mockOnChange2).toHaveBeenCalledWith("testx");
    });
  });
});
