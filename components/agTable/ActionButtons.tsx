"use client";
import { GridApi } from "ag-grid-enterprise";
import { createPortal } from "react-dom";
import { CircleCheck, CircleOff, Edit2Icon, MoreVertical } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { optionsForRemidiate, revokeOption } from "@/utils/utils";
import Select from "react-select";
import ToggleSwitch from "../ToggleSwitch";
import Buttons from "react-multi-date-picker/components/button";
import ProxyActionModal from "../ProxyActionModal";

interface ActionButtonsProps<T> {
  api: GridApi;
  selectedRows: T[];
  viewChangeEnable?: boolean;
}

const ActionButtons = <T,>({
  api,
  selectedRows,
  viewChangeEnable
}: ActionButtonsProps<T>) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });

  // const usersData = [
  //   { id: 1, username: "john_doe", email: "john@example.com", role: "admin" },
  //   {
  //     id: 2,
  //     username: "jane_smith",
  //     email: "jane@example.com",
  //     role: "editor",
  //   },
  //   { id: 3, username: "alex_king", email: "alex@example.com", role: "viewer" },
  // ];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [changeAccountOwner, setChangeAccountOwner] = useState(false);
  const [sendForApproval, setSendForApproval] = useState(false);
  const [modifyAccessChecked, setModifyAccessChecked] = useState(false);
  const [immediateRevokeChecked, setImmediateRevokeChecked] = useState(false);
  const [modifyAccessSelectedOption, setModifyAccessSelectedOption] =
    useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [revokeSelection, setRevokeSelection] = useState(null);
  const [comment, setComment] = useState("");
  const [reviewerType, setReviewerType] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState<User | Group | null>(null);


  const handleChangeAccountOwner = (checked: boolean) => {
   setChangeAccountOwner(checked);
  if (checked) {
    setIsModalOpen(true);
  } else {
    setSelectedOwner(null); // ✅ Clear selected owner on toggle NO
  }
  };

  // Bulk Approve
  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!api || !selectedRows || selectedRows.length === 0) return;
    api.applyTransaction({
      update: selectedRows.map((row) => ({ ...row, status: "Approved" })),
    });
  };

  //Bulk Revoke
  const handleRevoke = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!api || selectedRows.length === 0) return;
    api.applyTransaction({
      update: selectedRows.map((row) => ({ ...row, status: "Revoked" })),
    });
  };

  //Bulk Comment
  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedRows.length === 0) return;
    alert(`Adding comment for ${selectedRows.length} selected rows`);
  };
  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);

    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom,
        left: rect.left - 128,
      });
    }
  };
  const handleClickOutside = (event: MouseEvent) => {
    if (
      menuRef.current &&
      !menuRef.current.contains(event.target as Node) &&
      menuButtonRef.current &&
      !menuButtonRef.current.contains(event.target as Node)
    ) {
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const openModal = () => {
    setIsModalOpen(true);
    setIsMenuOpen(false); // close dropdown when modal opens
  };

  // const closeModal = () => {
  //   setIsModalOpen(false);
  //   setSelectedAttribute("");
  //   setSearchValue("");
  // };

  const openSidebar = () => {
    setIsSidebarOpen(true);
    setIsMenuOpen(false); // Optional: close dropdown when sidebar opens
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex space-x-4 h-full items-center">
      <button onClick={handleApprove} title="Approve">
        <CircleCheck
          className="cursor-pointer  hover:opacity-80"
          color="#5C48DF"
          strokeWidth="1"
          size="32"
        />
      </button>

      <button onClick={handleRevoke} title="Revoke">
        <CircleOff
          className="cursor-pointer hover:opacity-80 transform rotate-90"
          color="#FF2D55"
          strokeWidth="1"
          size="32"
        />
      </button>

      <button onClick={handleComment} title="Comment">
        <svg
          width="30"
          height="30"
          viewBox="0 0 32 32"
          className="cursor-pointer hover:opacity-80"
        >
          <path
            d="M0.700195 0V19.5546H3.5802V25.7765C3.57994 25.9525 3.62203 26.1247 3.70113 26.2711C3.78022 26.4176 3.89277 26.5318 4.02449 26.5992C4.15621 26.6666 4.30118 26.6842 4.44101 26.6498C4.58085 26.6153 4.70926 26.5304 4.80996 26.4058C6.65316 24.1232 10.3583 19.5546 10.3583 19.5546H25.1802V0H0.700195ZM2.1402 1.77769H23.7402V17.7769H9.76212L5.0202 23.6308V17.7769H2.1402V1.77769ZM5.0202 5.33307V7.11076H16.5402V5.33307H5.0202ZM26.6202 5.33307V7.11076H28.0602V23.11H25.1802V28.9639L20.4383 23.11H9.34019L7.9002 24.8877H19.8421C19.8421 24.8877 23.5472 29.4563 25.3904 31.7389C25.4911 31.8635 25.6195 31.9484 25.7594 31.9828C25.8992 32.0173 26.0442 31.9997 26.1759 31.9323C26.3076 31.8648 26.4202 31.7507 26.4993 31.6042C26.5784 31.4578 26.6204 31.2856 26.6202 31.1096V24.8877H29.5002V5.33307H26.6202ZM5.0202 8.88845V10.6661H10.7802V8.88845H5.0202ZM5.0202 12.4438V14.2215H19.4202V12.4438H5.0202Z"
            fill="#2684FF"
          />
        </svg>
      </button>

      {viewChangeEnable && (
        <button onClick={handleComment} title="Change view">
          <svg
            width="32"
            height="30.118"
            viewBox="0 0 32 30.118"
            className="cursor-pointer hover:opacity-80 transfrom scale-[0.6]"
          >
            <path
              fill="#35353A"
              d="M30.08 13.749H13.34a.64.64 0 0 0-.425.16.53.53 0 0 0-.175.388v15.275a.53.53 0 0 0 .175.386c.113.102.265.16.425.16h16.744a.63.63 0 0 0 .424-.16.53.53 0 0 0 .177-.386V14.296c0-.301-.269-.546-.602-.546m-4.655 13.694-9.464-.004a.32.32 0 0 1-.211-.079.26.26 0 0 1-.088-.194V15.718c0-.267.491-.38.659-.16l9.212 11.45c.137.183.134.433-.107.433M18.116 0h-16.8a.66.66 0 0 0-.425.16.6.6 0 0 0-.132.177.6.6 0 0 0-.044.209v14.746q0 .109.045.207a.6.6 0 0 0 .13.179q.085.075.196.119.109.04.23.041h6.615c.16 0 .312-.056.425-.16l5.728-3.94h4.032a.66.66 0 0 0 .425-.16.6.6 0 0 0 .13-.177.6.6 0 0 0 .045-.209V.546a.6.6 0 0 0-.043-.207.6.6 0 0 0-.132-.179.66.66 0 0 0-.425-.16M6.573 26.839h3.981a.66.66 0 0 1 .424.16.6.6 0 0 1 .132.177.6.6 0 0 1 .045.209v2.187a.6.6 0 0 1-.045.207.6.6 0 0 1-.132.179.66.66 0 0 1-.425.16H3.569a.8.8 0 0 1-.23-.041.6.6 0 0 1-.196-.119.6.6 0 0 1-.132-.177.6.6 0 0 1-.043-.211v-6.889H1.165a.64.64 0 0 1-.324-.085.56.56 0 0 1-.222-.232.51.51 0 0 1 .09-.584l3.605-3.827a.66.66 0 0 1 .913 0l3.605 3.827q.113.12.137.279a.5.5 0 0 1-.049.305.56.56 0 0 1-.22.232.64.64 0 0 1-.326.087H6.573zm17.95-23.503h-3.68a.66.66 0 0 1-.425-.16.6.6 0 0 1-.132-.177.6.6 0 0 1-.043-.209V.604q0-.109.045-.211a.6.6 0 0 1 .13-.177.66.66 0 0 1 .425-.16h6.682a.66.66 0 0 1 .427.16q.085.079.13.177a.6.6 0 0 1 .045.211v6.889h1.803q.173 0 .324.085.147.087.22.232a.51.51 0 0 1-.088.584l-3.605 3.827a.66.66 0 0 1-.913 0l-3.605-3.827a.51.51 0 0 1-.088-.584.56.56 0 0 1 .22-.232.64.64 0 0 1 .324-.087h1.803z"
            />
          </svg>
        </button>
      )}

      {/* Dropdown */}
      <button
        ref={menuButtonRef}
        onClick={toggleMenu}
        title="More Actions"
        className={`cursor-pointer rounded-sm hover:opacity-80 ${
          isMenuOpen ? "bg-[#6D6E73]/20" : ""
        }`}
      >
        <MoreVertical
          color="#35353A"
          size="32"
          className="transfrom scale-[0.6]"
        />
      </button>
      <div className="relative flex items-center">
        {isMenuOpen &&
          createPortal(
            <div
              ref={menuRef}
              className="absolute bg-white border border-gray-300 shadow-lg rounded-md z-50"
              style={{
                position: "fixed",
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                minWidth: "160px",
                padding: "8px",
              }}
            >
              <ul className="py-2 text-sm text-gray-700">
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={openModal}
                >
                  Proxy
                </li>
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                  Delegate
                </li>
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={openSidebar}
                >
                  Remediate
                </li>
              </ul>
            </div>,
            document.body
          )}
      </div>
      {/* <ProxyActionModal
        isModalOpen={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
      /> */}
      <ProxyActionModal
        isModalOpen={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
        heading="Proxy Action"
        users={[
          { username: "john", email: "john@example.com", role: "admin" },
          { username: "jane", email: "jane@example.com", role: "user" },
        ]}
        groups={[
          { name: "admins", email: "admins@corp.com", role: "admin" },
          { name: "devs", email: "devs@corp.com", role: "developer" },
        ]}
        userAttributes={[
          { value: "username", label: "Username" },
          { value: "email", label: "Email" },
        ]}
        groupAttributes={[
          { value: "name", label: "Group Name" },
          { value: "role", label: "Role" },
        ]}
        onSelectOwner={(owner) => {
          setSelectedOwner(owner);
          setIsModalOpen(false);
        }}
      />
      {isSidebarOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex h-[calc(100%-4rem)] top-17">
            {/* Backdrop */}
            <div className="flex-1 bg-black/40" onClick={closeSidebar} />

            <div className="max-w-3xl mx-auto p-2 bg-white shadow-lg rounded-xl border border-gray-200 space-y-6 text-sm">
              <div>
                <h2 className="text-lg font-semibold">Remediate action</h2>
              </div>

              {/* User and Role */}
              <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-md">
                <div className="flex-1">
                  <p className="font-medium">Derrick Watson</p>
                  <p className="text-gray-500">
                    Derrick.Watson@conductorone.com - User - SSO
                  </p>
                </div>
                <span className="text-gray-400">→</span>
                <div className="flex-1">
                  <p className="font-medium">Admin</p>
                  <p className="text-gray-500">AWS - IAM role</p>
                </div>
              </div>

              {/* Mark as Elevated Access */}
              <div className="items-center space-x-4 p-2 bg-gray-50 rounded-md">
                {/* <div>
                  <h2 className="font-semibold text-base">
                    Mark as Elevated Access
                  </h2>
                </div> */}

                <div className="mt-4 flex gap-5">
                  <span>Change Account Owner</span>
                  <span className="flex gap-2 items-center">
                    No
                    <ToggleSwitch
                      checked={changeAccountOwner}
                      onChange={handleChangeAccountOwner}
                    />
                    Yes
                  </span>
                </div>
                {selectedOwner && (
                  <div className="text-sm text-gray-700 mt-2">
                    <strong>Selected Owner:</strong>{" "}
                    {Object.values(selectedOwner).join(" | ")}
                  </div>
                )}
                <div>
                  <span className="flex items-center mt-4 mb-2">
                    Select Approver
                  </span>
                  <Select
                    options={optionsForRemidiate}
                    styles={{
                      control: (base) => ({ ...base, fontSize: "0.875rem" }),
                    }}
                  />
                </div>

                <div className="mt-4 flex gap-14">
                  <span>Send For Approval</span>
                  <span className="flex gap-2 items-center">
                    No
                    <ToggleSwitch
                      checked={sendForApproval}
                      onChange={(checked) => setSendForApproval(checked)}
                    />
                    Yes
                  </span>
                </div>
                <div className="mt-6 flex justify-center">
                  <Buttons className="bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700">
                    Save Action
                  </Buttons>
                </div>
              </div>

              {/* Modify Access */}
              <div
                className={`items-center space-x-4 p-2 rounded-md ${
                  immediateRevokeChecked ? "bg-gray-200" : "bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modifyAccessChecked}
                      disabled={immediateRevokeChecked}
                      onChange={(e) => setModifyAccessChecked(e.target.checked)}
                      className="cursor-pointer"
                    />
                    <h2 className="font-semibold">Modify Access</h2>
                  </label>

                  {modifyAccessChecked && (
                    <Buttons
                      onClick={() => setShowConfirmation(true)}
                      disabled={!modifyAccessSelectedOption}
                      className={`cursor-pointer text-white rounded-sm p-2 ${
                        !modifyAccessSelectedOption || immediateRevokeChecked
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-[#15274E]"
                      }`}
                    >
                      Modify Access
                    </Buttons>
                  )}
                </div>

                {modifyAccessChecked && (
                  <div className="mt-2">
                    <span className="flex items-center m-2">
                      Select New Access
                    </span>
                    <Select
                      options={optionsForRemidiate}
                      isDisabled={immediateRevokeChecked}
                      value={modifyAccessSelectedOption}
                      onChange={setModifyAccessSelectedOption}
                      styles={{
                        control: (base) => ({
                          ...base,
                          fontSize: "0.875rem",
                        }),
                        menu: (base) => ({
                          ...base,
                          fontSize: "0.875rem",
                        }),
                      }}
                    />
                  </div>
                )}
                {modifyAccessChecked && (
                  <div className="mt-2">
                    <span className="flex items-center m-2">Comments</span>
                    <div className="flex">
                      <textarea
                        className="form-input mr-2"
                        rows={1}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      <Buttons
                        disabled={!comment.trim()}
                        className={`rounded-lg p-2 ${
                          comment.trim()
                            ? "bg-[#2684ff] text-white hover:bg-blue-600"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        <Edit2Icon />
                      </Buttons>
                    </div>
                  </div>
                )}

                {showConfirmation && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-md shadow-md max-w-sm space-y-4">
                      <p className="text-sm">
                        Are you sure you want to modify access?
                      </p>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setShowConfirmation(false)}
                          className="px-3 py-1 text-sm bg-gray-300 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            // TODO: handle the confirm action
                            setShowConfirmation(false);
                            setModifyAccessSelectedOption(null);

                            console.log(
                              "Confirmed with:",
                              modifyAccessSelectedOption
                            );
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Immediate Revoke */}
              <div
                className={`items-center space-x-4 p-2 rounded-md ${
                  modifyAccessChecked ? "bg-gray-200" : "bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={immediateRevokeChecked}
                      disabled={modifyAccessChecked}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setImmediateRevokeChecked(checked);

                        if (!checked) {
                          // Reset all related states
                          setRevokeSelection(null);
                          setReviewerType(null);
                          setComment("");
                          setIsModalOpen(false);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <h2 className="font-semibold">Immediate Revoke</h2>
                  </label>

                  {immediateRevokeChecked && (
                    <Buttons
                      disabled={!revokeSelection}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to revoke access?"
                          )
                        ) {
                          setRevokeSelection(null);
                          // Add other logic like API call here
                        }
                      }}
                      className={`rounded-sm p-2 ${
                        revokeSelection
                          ? "bg-[#e22f2e] text-white hover:bg-red-600"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      Revoke Access
                    </Buttons>
                  )}
                </div>

                {immediateRevokeChecked && (
                  <div className="mt-2">
                    <span className="flex items-center m-2">Options</span>
                    <Select
                      options={revokeOption}
                      value={revokeSelection}
                      onChange={(selected) => setRevokeSelection(selected)}
                      isDisabled={modifyAccessChecked}
                      styles={{
                        control: (base) => ({ ...base, fontSize: "0.875rem" }),
                        menu: (base) => ({ ...base, fontSize: "0.875rem" }),
                      }}
                    />
                  </div>
                )}
                {immediateRevokeChecked &&
                  revokeSelection?.value === "Revoke post approval" && (
                    <div className="mt-2">
                      <span className="flex items-center m-2">
                        Select Reviewer
                      </span>
                      <Select
                        options={[
                          {
                            label: "2nd level reviewer",
                            value: "second_level",
                          },
                          { label: "Select custom user", value: "custom_user" },
                        ]}
                        value={reviewerType}
                        onChange={(selected) => {
                          setReviewerType(selected);
                          if (selected?.value === "custom_user") {
                            setIsModalOpen(true);
                          }
                        }}
                        styles={{
                          control: (base) => ({
                            ...base,
                            fontSize: "0.875rem",
                          }),
                          menu: (base) => ({ ...base, fontSize: "0.875rem" }),
                        }}
                      />
                    </div>
                  )}
                {immediateRevokeChecked && (
                  <div className="mt-2">
                    <span className="flex items-center m-2">Comments</span>
                    <div className="flex">
                      <textarea
                        className="form-input mr-2"
                        rows={1}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      <Buttons
                        disabled={!comment.trim()}
                        className={`rounded-lg p-2 ${
                          comment.trim()
                            ? "bg-[#2684ff] text-white hover:bg-blue-600"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        <Edit2Icon />
                      </Buttons>
                    </div>
                  </div>
                )}
              </div>

              {/* Comment */}
              {/* <div className="pt-4">
                <input
                  type="text"
                  placeholder="Add a comment"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <button className="mt-4 bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded-lg">
                  Publish
                </button>
              </div> */}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ActionButtons;
