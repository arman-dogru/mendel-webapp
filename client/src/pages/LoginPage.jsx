import LoginButton from "../components/LoginButton/LoginButton";

function LoginPage() {
  return (
    <div className="min-h-screen bg-darkBg flex flex-col justify-center items-center">
      <p className="text-textSecondary mb-6">
        Sign in to explore repositories, collaborate on projects, and more!
      </p>
      <LoginButton />
    </div>
  );
}

export default LoginPage;
