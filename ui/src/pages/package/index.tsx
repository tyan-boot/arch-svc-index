import styled from "styled-components";
import { FormattedItem } from "../../model";
import { filesize } from "filesize";
import { useEffect, useState } from "react";
import "./index.css";

const SearchInput = styled.input`
  width: 95%;
  height: 32px;
  margin-top: 1rem;
`;

const Code = styled.code`
  background-color: #f7f7f9;
  color: #ff4d6d;
  padding: 1px 2px;
  border-radius: 4px;
  border: 1px solid #e1e1e8;
  font-size: 12px;
`;

function PackageCard({ pkg }: { pkg: FormattedItem }) {
  return (
    <div className={"pkg-card"}>
      <span
        className={"pkg-name"}
        dangerouslySetInnerHTML={{ __html: pkg._formatted.name }}
      ></span>
      <p
        className={"pkg-desc"}
        dangerouslySetInnerHTML={{ __html: pkg._formatted.desc }}
      ></p>

      <div className={"pkg-props"}>
        <div className={"pkg-prop-item"}>
          <span className={"pkg-prop-name"}>Name:</span>
          <Code
            dangerouslySetInnerHTML={{ __html: pkg._formatted.name }}
          ></Code>
        </div>

        <div className={"pkg-prop-item"}>
          <span className={"pkg-prop-name"}>Version:</span>
          <span className={"tag blue"}>{pkg.version}</span>
        </div>

        <div className={"pkg-prop-item"}>
          <span className={"pkg-prop-name"}>Url:</span>
          <a
            href={pkg.url}
            target={"_blank"}
            className={"is-url"}
            rel={"noreferrer"}
          >
            {pkg.url}
          </a>
        </div>

        <div className={"pkg-prop-item"}>
          <span className={"pkg-prop-name"}>Size(Download):</span>
          <span className={"tag pink"}>
            {filesize(pkg.c_size, { base: 2 }) as string}
          </span>
        </div>

        <div className={"pkg-prop-item"}>
          <span className={"pkg-prop-name"}>Size(Install):</span>
          <span className={"tag orange"}>
            {filesize(pkg.i_size, { base: 2 }) as string}
          </span>
        </div>
      </div>
    </div>
  );
}

const SearchResult = styled.div`
  margin-top: 2rem;
`;

const MoreButton = styled.button`
  margin: 1rem;
  padding: 8px;
`;

export function PackageSearch() {
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [estimateCount, setEstimate] = useState(0);

  const [packages, setPackages] = useState<FormattedItem[]>([]);

  useEffect(() => {
    if (q === "") {
      setPackages([]);
      return;
    }

    fetch("/api/search/packages", {
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
        setPackages(resp["hits"]);
      });
  }, [q]);

  useEffect(() => {
    if (q === "") {
      setPackages([]);
      return;
    }

    if (offset === 0) {
      return;
    }

    fetch("/api/search/packages", {
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
        setPackages([...packages, ...resp["hits"]]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  return (
    <div className={"content-root"}>
      <p>quick search any archlinux package over 13000 packages</p>

      <SearchInput
        autoFocus={true}
        type={"text"}
        placeholder={"type something to start search"}
        onChange={(e) => {
          setOffset(0);
          setQ(e.target.value);
        }}
      />
      <SearchResult className={"search-result"}>
        {packages.map((p) => (
          <PackageCard pkg={p} />
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
