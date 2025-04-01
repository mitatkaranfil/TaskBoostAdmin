import React from "react";
import useUser from "@/hooks/useUser";

const Header: React.FC = () => {
  const { user } = useUser();
  
  if (!user) return null;
  
  return (
    <header className="px-4 py-4 bg-dark-lighter shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {user.photoUrl ? (
            <img
              src={user.photoUrl}
              alt={`${user.firstName || 'User'}'s Avatar`}
              className="w-10 h-10 rounded-full mr-3"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
              <span className="text-primary font-medium">
                {user?.firstName ? user.firstName.charAt(0) : '?'}
              </span>
            </div>
          )}
          <div>
            <h2 className="font-semibold">{user.firstName || 'User'}</h2>
            <div className="text-xs text-gray-400">
              ID: <span>{user.telegramId}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <div className="flex items-center text-secondary">
            <i className="ri-vip-crown-fill mr-1"></i>
            <span className="font-mono font-medium">Seviye {user.level}</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            <span>{user.referralCount || 0}</span> referans
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
