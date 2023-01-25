import { SearchInput } from "../../components/search-input";
import { useNavigate } from "react-router";

export function Welcome() {
  const navigate = useNavigate();

  return (
    <div className={"content-root"}>
      <h2>welcome to archlinux index</h2>

      <p>type something below to start a search</p>

      <SearchInput
        onClick={() => {
          navigate("/packages");
        }}
      />
    </div>
  );
}