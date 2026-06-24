import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

jest.mock("./utils/api", () => {
  const actual = jest.requireActual("./utils/api");
  return {
    ...actual,
    validateSession: jest.fn(() => Promise.resolve(null)),
    getStoredUser: jest.fn(() => null),
    getToken: jest.fn(() => null),
    fetchPublicConfig: jest.fn(() =>
      Promise.resolve({
        district: { appTitle: "Tirap Performance Index", districtName: "Tirap" }
      })
    )
  };
});

test("shows login page after session check completes", async () => {
  render(<App />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: /Performance Index/i })).toBeInTheDocument();
  });

  expect(screen.getByText(/Sign in to your dashboard/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Sign In$/i })).toBeInTheDocument();
});
