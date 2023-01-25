import styled from "styled-components";
import { useEffect, useState } from "react";
import { SearchInput } from "../../components/search-input";
import { FormattedUnitItem } from "../../model";
import "./index.css";
import { useLocation } from "react-router";

const SearchResult = styled.div`
  margin-top: 2rem;
`;

const MoreButton = styled.button`
  margin: 1rem;
  padding: 8px;
`;

type Props = {
  type: "services" | "timers";
};

function UnitCard({ unit, type }: { unit: FormattedUnitItem } & Props) {
  return (
    <div className={"unit-card"}>
      <span
        className={"unit-name"}
        dangerouslySetInnerHTML={{ __html: unit._formatted.filename }}
      ></span>

      <div className={"unit-metadata"}>
        <span className={"metadata-label"}>Package:</span>
        <span
          className={"tag blue"}
          dangerouslySetInnerHTML={{ __html: unit._formatted.package }}
        ></span>
      </div>

      <a className={"unit-download"} href={`/file/${type}/${unit.id}`}>
        Download
      </a>

      <pre dangerouslySetInnerHTML={{ __html: unit._formatted.content }}></pre>
    </div>
  );
}

export function UnitSearch({ type }: Props) {
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [estimateCount, setEstimate] = useState(0);

  const [units, setUnits] = useState<FormattedUnitItem[]>([]);

  const location = useLocation();

  useEffect(() => {
    setQ("");
    setOffset(0);
    setEstimate(0);
    setUnits([]);
  }, [location]);

  useEffect(() => {
    if (q === "") {
      return;
    }

    fetch(`/api/search/${type}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        q: q,
        attributesToHighlight: ["*"],
        matchingStrategy: "all",
      }),
    })
      .then((resp) => resp.json())
      .then((resp) => {
        console.log(resp);
        setEstimate(resp["estimatedTotalHits"]);
        setUnits(resp["hits"]);
      })
      .catch((e) => {
        console.error(e);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (q === "") {
      setUnits([]);
      return;
    }

    if (offset === 0) {
      return;
    }

    fetch(`/api/search/${type}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        q: q,
        offset: offset,
        attributesToHighlight: ["*"],
        matchingStrategy: "all",
      }),
    })
      .then((resp) => resp.json())
      .then((resp) => {
        console.log(resp);
        setEstimate(resp["estimatedTotalHits"]);
        setUnits([...units, ...resp["hits"]]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  return (
    <div className={"content-root"}>
      <p>wanna write a systemd {type} unit file, but don't know how to?</p>

      <p>search a exist {type} unit files!</p>

      <SearchInput
        type={"text"}
        placeholder={"type something to start search, e.g, docker.service"}
        onChange={(e) => {
          setOffset(0);
          setQ(e.target.value);
        }}
      />

      <SearchResult className={"search-result"}>
        {units.map((u) => (
          <UnitCard unit={u} type={type} />
        ))}

        {q !== "" &&
          (offset < estimateCount ? (
            <MoreButton onClick={() => setOffset(offset + 20)}>
              load more
            </MoreButton>
          ) : (
            "no more"
          ))}
      </SearchResult>
    </div>
  );
}
