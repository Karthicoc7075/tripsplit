import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GlobalSearch } from "../GlobalSearch";
import { BrowserRouter } from "react-router-dom";

vi.mock("@/context/DataContext", () => ({
  useData: () => ({
    outings: [],
    friends: [],
    transactions: [],
  })
}));

describe("GlobalSearch", () => {
  it("renders correctly and responds to close events", () => {
    const handleClose = vi.fn();
    
    render(
      <BrowserRouter>
        <GlobalSearch open={true} onOpenChange={handleClose} />
      </BrowserRouter>
    );
    
    // Check if the search input renders
    const inputElement = screen.getByPlaceholderText(/Search outings, friends, transactions/i);
    expect(inputElement).toBeInTheDocument();
    
    // Simulate escape key press to trigger close
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    
    // Test if onClose was called
    expect(handleClose).toHaveBeenCalled();
  });
});
