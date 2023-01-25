import React from "react";
import { Outlet } from "react-router";
import styled from "styled-components";
import { Link, NavLink } from "react-router-dom";

const Linux = styled.span`
  color: #1793d1;
`;

function App() {
  return (
    <div className={"container"}>
      <nav>
        <div className={"nav-title"}>
          <Link to={"/"}>
            Arch<Linux>Linux</Linux> Index
          </Link>
        </div>

        <div className={"nav-item"}>
          <NavLink to={"/packages"}>Package</NavLink>
        </div>
        <div className={"nav-item"}>
          <NavLink to={"/services"}>Services</NavLink>
        </div>
        <div className={"nav-item"}>
          <NavLink to={"/timers"}>Timers</NavLink>
        </div>
      </nav>

      <section className={"main-section"}>
        <Outlet />
      </section>

      <footer>this is a footer</footer>
    </div>
  );
}

export default App;
