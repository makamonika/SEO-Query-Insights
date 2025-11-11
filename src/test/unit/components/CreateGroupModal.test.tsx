import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import type { QueryDto } from "@/types";

// Mock UI components

interface DialogProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface DialogContentProps {
  children: ReactNode;
}

interface DialogHeaderProps {
  children: ReactNode;
}

interface DialogTitleProps {
  children: ReactNode;
}

interface DialogDescriptionProps {
  children: ReactNode;
}

interface DialogFooterProps {
  children: ReactNode;
}

interface InputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  [key: string]: unknown;
}

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
}

interface LabelProps {
  children: ReactNode;
  htmlFor?: string;
}

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: DialogProps) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: DialogContentProps) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: DialogHeaderProps) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: DialogTitleProps) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: DialogDescriptionProps) => <p data-testid="dialog-description">{children}</p>,
  DialogFooter: ({ children }: DialogFooterProps) => <div data-testid="dialog-footer">{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, disabled, ...props }: InputProps) => (
    <input value={value} onChange={onChange} disabled={disabled} data-testid="group-name-input" {...props} />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, type, variant }: ButtonProps) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      data-variant={variant}
      data-testid={variant === "outline" ? "cancel-button" : "submit-button"}
      aria-disabled={disabled ? "true" : "false"}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: LabelProps) => (
    <label htmlFor={htmlFor} data-testid="label">
      {children}
    </label>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }: BadgeProps) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

// Test data factory
function createMockQuery(overrides: Partial<QueryDto> = {}): QueryDto {
  return {
    id: "query-1",
    queryText: "test query",
    url: "https://example.com/page",
    impressions: 1000,
    clicks: 50,
    ctr: 0.05,
    avgPosition: 5.5,
    isOpportunity: false,
    date: "2024-01-01",
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("CreateGroupModal", () => {
  const mockOnCreate = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GRP-01: Create a new group from selected queries", () => {
    it("should render modal with group name input and selected queries", () => {
      // Arrange
      const queries = [
        createMockQuery({ id: "q1", queryText: "query 1" }),
        createMockQuery({ id: "q2", queryText: "query 2" }),
      ];

      // Act
      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      // Assert
      expect(screen.getByTestId("dialog-title")).toHaveTextContent("Create New Group");
      expect(screen.getByTestId("dialog-description")).toHaveTextContent(
        "Create a manual group with 2 selected queries"
      );
      expect(screen.getByTestId("group-name-input")).toBeInTheDocument();
      expect(screen.getAllByTestId("badge")).toHaveLength(2);
    });

    it("should display selected queries list with numbering", () => {
      // Arrange
      const queries = [
        createMockQuery({ id: "q1", queryText: "first query" }),
        createMockQuery({ id: "q2", queryText: "second query" }),
        createMockQuery({ id: "q3", queryText: "third query" }),
      ];

      // Act
      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      // Assert
      expect(screen.getByText("first query")).toBeInTheDocument();
      expect(screen.getByText("second query")).toBeInTheDocument();
      expect(screen.getByText("third query")).toBeInTheDocument();
      expect(screen.getAllByTestId("badge")).toHaveLength(3);
    });

    it("should show 'No queries selected' when queries array is empty", () => {
      // Arrange
      const queries: QueryDto[] = [];

      // Act
      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      // Assert
      expect(screen.getByText("No queries selected")).toBeInTheDocument();
    });

    it("should reset form when modal opens", async () => {
      // Arrange
      const user = userEvent.setup();
      const queries = [createMockQuery()];

      const { rerender } = render(
        <CreateGroupModal
          open={false}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      // Act - Open modal and type
      rerender(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      const input = screen.getByTestId("group-name-input");
      await user.type(input, "Test Name");

      // Close and reopen
      rerender(
        <CreateGroupModal
          open={false}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      rerender(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      // Assert - Input should be empty
      expect(screen.getByTestId("group-name-input")).toHaveValue("");
    });
  });

  describe("GRP-02: Validation and Error Handling", () => {
    it("should show validation error when submitting empty name", async () => {
      // Arrange
      const user = userEvent.setup();
      const queries = [createMockQuery()];

      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      const submitButton = screen.getByTestId("submit-button");

      // Act - Click submit button with empty name
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Group name is required")).toBeInTheDocument();
      });
      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it("should show validation error when submitting whitespace-only name", async () => {
      // Arrange
      const user = userEvent.setup();
      const queries = [createMockQuery()];

      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      const input = screen.getByTestId("group-name-input");
      const submitButton = screen.getByTestId("submit-button");

      // Act - Type whitespace and click submit
      await user.type(input, "   ");
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Group name is required")).toBeInTheDocument();
      });
      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it("should display error from parent component", () => {
      // Arrange
      const queries = [createMockQuery()];
      const errorMessage = "A group with this name already exists";

      // Act
      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          error={errorMessage}
          queries={queries}
        />
      );

      // Assert
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it("should clear validation error when user starts typing", async () => {
      // Arrange
      const user = userEvent.setup();
      const queries = [createMockQuery()];

      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      const input = screen.getByTestId("group-name-input");
      const submitButton = screen.getByTestId("submit-button");

      // Act - Submit empty form to trigger validation error
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Group name is required")).toBeInTheDocument();
      });

      // Type in input
      await user.type(input, "Valid Name");

      // Assert - Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText("Group name is required")).not.toBeInTheDocument();
      });
    });

    it("should clear validation error when modal closes", () => {
      const queries = [createMockQuery()];
      const errorMessage = "Error message";

      const { rerender } = render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          error={errorMessage}
          queries={queries}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();

      // Close modal
      rerender(
        <CreateGroupModal
          open={false}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          error={errorMessage}
          queries={queries}
        />
      );

      // Reopen modal
      rerender(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      // Error should be cleared
      expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
    });

    it("should set aria-invalid when there is an error", () => {
      // Arrange
      const queries = [createMockQuery()];
      const errorMessage = "Error message";

      // Act
      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          error={errorMessage}
          queries={queries}
        />
      );

      // Assert
      const input = screen.getByTestId("group-name-input");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAttribute("aria-describedby", "name-error");
    });
  });

  describe("Loading and Disabled States", () => {
    it("should disable input and buttons when isSubmitting is true", () => {
      // Arrange
      const queries = [createMockQuery()];

      // Act
      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={true}
          queries={queries}
        />
      );

      // Assert
      expect(screen.getByTestId("group-name-input")).toBeDisabled();
      expect(screen.getByTestId("cancel-button")).toBeDisabled();
      expect(screen.getByTestId("submit-button")).toBeDisabled();
    });

    it("should show 'Creating...' text on submit button when submitting", () => {
      // Arrange
      const queries = [createMockQuery()];

      // Act
      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={true}
          queries={queries}
        />
      );

      // Assert
      expect(screen.getByTestId("submit-button")).toHaveTextContent("Creating...");
    });

    it("should not disable submit button when name is empty (validation happens on submit)", () => {
      // Arrange
      const queries = [createMockQuery()];

      // Act
      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      // Assert - Button is enabled to allow validation error to be shown
      expect(screen.getByTestId("submit-button")).not.toBeDisabled();
    });

    it("should enable submit button when name is not empty", async () => {
      // Arrange
      const user = userEvent.setup();
      const queries = [createMockQuery()];

      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      const input = screen.getByTestId("group-name-input");

      // Act
      await user.type(input, "Test Group");

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("submit-button")).not.toBeDisabled();
      });
    });
  });

  describe("Modal Interaction", () => {
    it("should call onOpenChange when cancel button is clicked", async () => {
      // Arrange
      const user = userEvent.setup();
      const queries = [createMockQuery()];

      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      const cancelButton = screen.getByTestId("cancel-button");

      // Act
      await user.click(cancelButton);

      // Assert
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it("should not render modal when open is false", () => {
      // Arrange
      const queries = [createMockQuery()];

      // Act
      render(
        <CreateGroupModal
          open={false}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      // Assert
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("should handle form submission via Enter key", async () => {
      // Arrange
      const user = userEvent.setup();
      const queries = [createMockQuery()];

      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      const input = screen.getByTestId("group-name-input");

      // Act
      await user.type(input, "Test Group{Enter}");

      // Assert
      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith({
          name: "Test Group",
          aiGenerated: false,
        });
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper aria-label on input", () => {
      // Arrange
      const queries = [createMockQuery()];

      // Act
      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      // Assert
      const input = screen.getByTestId("group-name-input");
      expect(input).toHaveAttribute("aria-label", "Group name");
    });

    it("should display query count in label", () => {
      // Arrange
      const queries = [createMockQuery({ id: "q1" }), createMockQuery({ id: "q2" }), createMockQuery({ id: "q3" })];

      // Act
      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      // Assert
      expect(screen.getByText("Selected Queries (3)")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle onCreate promise rejection gracefully", async () => {
      // Arrange
      const user = userEvent.setup();
      const queries = [createMockQuery()];
      const mockOnCreateReject = vi.fn().mockRejectedValue(new Error("API error"));

      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreateReject}
          isSubmitting={false}
          queries={queries}
        />
      );

      const input = screen.getByTestId("group-name-input");
      const submitButton = screen.getByTestId("submit-button");

      // Act
      await user.type(input, "Test Group");
      await user.click(submitButton);

      // Assert - Should not throw unhandled promise rejection
      await waitFor(() => {
        expect(mockOnCreateReject).toHaveBeenCalled();
      });
    });

    it("should handle very long group names", async () => {
      // Arrange
      const user = userEvent.setup();
      const queries = [createMockQuery()];
      const longName = "A".repeat(200);

      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      const input = screen.getByTestId("group-name-input");
      const submitButton = screen.getByTestId("submit-button");

      // Act
      await user.type(input, longName);
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith({
          name: longName,
          aiGenerated: false,
        });
      });
    });

    it("should handle special characters in group name", async () => {
      // Arrange
      const user = userEvent.setup();
      const queries = [createMockQuery()];
      const specialName = "Test & Group #1 (2024)";

      render(
        <CreateGroupModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onCreate={mockOnCreate}
          isSubmitting={false}
          queries={queries}
        />
      );

      const input = screen.getByTestId("group-name-input");
      const submitButton = screen.getByTestId("submit-button");

      // Act
      await user.type(input, specialName);
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith({
          name: specialName,
          aiGenerated: false,
        });
      });
    });
  });
});
